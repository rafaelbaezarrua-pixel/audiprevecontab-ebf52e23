import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, X, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";

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
  certidoes: "Certidões",
  licencas: "Licenças",
  procuracoes: "Procurações",
  vencimentos: "Vencimentos",
  parcelamentos: "Parcelamentos",
  recalculos: "Recálculos",
  honorarios: "Honorários",
  agendamentos: "Agendamentos",
  declaracoes_anuais: "Declarações Anuais",
};

const ConfiguracoesPage: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*");
      if (profilesError) {
        console.error("Erro ao carregar perfis:", profilesError);
        return;
      }
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
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // Aguardar userData carregar antes de decidir redirect
  if (!userData) return null;
  if (!userData.isAdmin) return <Navigate to="/dashboard" replace />;

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
        <button onClick={() => navigate("/configuracoes/usuarios/novo")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}>
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
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${u.isAdmin || u.modules?.[key]
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

      <div className="space-y-6 pt-6 border-t border-border">
        <h3 className="text-lg font-bold text-card-foreground">Configurações de Notificações</h3>
        <NotificationConfig />
      </div>
    </div>
  );
};

const NotificationConfig: React.FC = () => {
  const [types, setTypes] = useState<any[]>([]);

  const loadData = async () => {
    const { data: nTypes } = await (supabase as any).from("notification_types").select("*");
    setTypes(nTypes || []);
  };

  useEffect(() => { loadData(); }, []);

  const toggleType = async (id: string, current: boolean) => {
    await (supabase as any).from("notification_types").update({ is_enabled: !current }).eq("id", id);
    toast.success("Configuração atualizada");
    loadData();
  };

  return (
    <div className="module-card">
      <h4 className="font-semibold text-sm mb-4">Gatilhos de Notificação</h4>
      <div className="space-y-3">
        {types.map(t => (
          <div key={t.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </div>
            <button
              onClick={() => toggleType(t.id, t.is_enabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${t.is_enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${t.is_enabled ? "left-7" : "left-1"}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfiguracoesPage;
