import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, X, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  isAdmin: boolean;
  departamento?: string;
  modules: Record<string, boolean>;
}

const moduleLabels: Record<string, string> = {
  societario: "Societário",
  fiscal: "Fiscal",
  pessoal: "Pessoal",
  certificados: "Certificados",
  procuracoes: "Procurações",
  vencimentos: "Vencimentos",
  parcelamentos: "Parcelamentos",
  recalculos: "Recálculos",
  honorarios: "Honorários",
  obrigacoes: "Obrigações",
};

const ConfiguracoesPage: React.FC = () => {
  const { userData } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", password: "", departamento: "", isAdmin: false, modules: {} as Record<string, boolean> });

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    if (!profiles) return;

    const users: Usuario[] = [];
    for (const p of profiles) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", p.user_id);
      const { data: perms } = await supabase.from("user_module_permissions").select("module_name").eq("user_id", p.user_id);
      const modules: Record<string, boolean> = {};
      perms?.forEach(pm => { modules[pm.module_name] = true; });
      users.push({
        id: p.user_id,
        nome: p.nome_completo || "Sem nome",
        email: "",
        isAdmin: roles?.some(r => r.role === "admin") || false,
        departamento: "",
        modules,
      });
    }
    setUsuarios(users);
  };

  useEffect(() => { loadUsers(); }, []);

  if (!userData?.isAdmin) return <Navigate to="/dashboard" replace />;

  const handleCreateUser = async () => {
    if (!form.nome.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Nome, email e senha são obrigatórios");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: form.email, password: form.password, nome: form.nome, isAdmin: form.isAdmin, modules: form.modules },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário criado com sucesso! O usuário poderá fazer login com as credenciais fornecidas.");
      setShowForm(false);
      setForm({ nome: "", email: "", password: "", departamento: "", isAdmin: false, modules: {} });
      loadUsers();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const toggleModule = async (userId: string, module: string, current: boolean) => {
    if (current) {
      await supabase.from("user_module_permissions").delete().eq("user_id", userId).eq("module_name", module);
    } else {
      await supabase.from("user_module_permissions").insert({ user_id: userId, module_name: module });
    }
    toast.success(`${moduleLabels[module]} ${!current ? "habilitado" : "desabilitado"}`);
    loadUsers();
  };

  const toggleAdmin = async (userId: string, current: boolean) => {
    if (current) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin" as const);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as const });
    }
    toast.success(!current ? "Promovido a admin" : "Removido de admin");
    loadUsers();
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Excluir este usuário do sistema?")) return;
    await supabase.from("profiles").delete().eq("user_id", userId);
    toast.success("Usuário removido!");
    loadUsers();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-card-foreground">Gerenciamento de Usuários</h3>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="space-y-4">
        {usuarios.map(u => (
          <div key={u.id} className="module-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-bold">{(u.nome || "U").slice(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-card-foreground">{u.nome || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{u.email} {u.departamento ? `• ${u.departamento}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAdmin(u.id, u.isAdmin)} className={`p-2 rounded-lg transition-colors ${u.isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-primary"}`} title={u.isAdmin ? "Remover admin" : "Tornar admin"}>
                  {u.isAdmin ? <Shield size={16} /> : <ShieldOff size={16} />}
                </button>
                <button onClick={() => handleDelete(u.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {Object.entries(moduleLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleModule(u.id, key, u.modules?.[key] || false)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    u.isAdmin || u.modules?.[key]
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {usuarios.length === 0 && (
          <div className="module-card text-center py-8">
            <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border"><h3 className="text-lg font-bold text-card-foreground">Novo Usuário</h3><button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Nome</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Senha</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Mínimo 6 caracteres" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isAdmin" checked={form.isAdmin} onChange={e => setForm({ ...form, isAdmin: e.target.checked })} className="rounded" />
                <label htmlFor="isAdmin" className="text-sm font-medium text-card-foreground">Administrador</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Módulos</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(moduleLabels).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-card-foreground">
                      <input type="checkbox" checked={form.modules[key] || false} onChange={e => setForm({ ...form, modules: { ...form.modules, [key]: e.target.checked } })} className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:bg-muted">Cancelar</button>
              <button onClick={handleCreateUser} className="px-4 py-2 text-sm font-semibold text-primary-foreground rounded-lg shadow-md" style={{ background: "var(--gradient-primary)" }}>Criar Usuário</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracoesPage;
