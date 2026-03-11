import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, X, Shield, ShieldOff, Users, Building } from "lucide-react";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import AuditoriaPage from "./AuditoriaPage";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  isAdmin: boolean;
  isClient: boolean;
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
  declaracoes_mensais: "Declarações Mensais",
};

const ConfiguracoesPage: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'interna' | 'cliente' | 'auditoria'>('interna');

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log("[ConfiguracoesPage] Iniciando carregamento de usuários...");
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*");
      console.log("[ConfiguracoesPage] Profiles retornados:", profiles?.length, "Erro:", profilesError);
      if (profilesError) {
        console.error("Erro ao carregar perfis:", profilesError);
        return;
      }
      if (!profiles || profiles.length === 0) {
        console.warn("[ConfiguracoesPage] Nenhum perfil encontrado na tabela profiles");
        return;
      }

      const userIds = profiles.map(p => p.user_id);

      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const { data: perms } = await supabase.from("user_module_permissions").select("user_id, module_name").in("user_id", userIds);
      const { data: access } = await supabase.from("empresa_acessos").select("user_id, empresa_id").in("user_id", userIds);

      const rolesByUserId = roles?.reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id]) acc[curr.user_id] = [];
        acc[curr.user_id].push(curr.role);
        return acc;
      }, {}) || {};

      const permsByUserId = perms?.reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id]) acc[curr.user_id] = [];
        acc[curr.user_id].push(curr.module_name);
        return acc;
      }, {}) || {};

      const accessByUserId = access?.reduce((acc: any, curr: any) => {
        acc[curr.user_id] = true;
        return acc;
      }, {}) || {};

      const users: Usuario[] = [];
      for (const p of profiles) {
        const userRoles = rolesByUserId[p.user_id] || [];
        const userPerms = permsByUserId[p.user_id] || [];

        const modules: Record<string, boolean> = {};
        userPerms.forEach((m: string) => { modules[m] = true; });

        // A user is a client if they have the 'client' role OR if they have enterprise accesses
        const isClient = userRoles.includes('client') || accessByUserId[p.user_id] === true;
        const isAdmin = userRoles.includes('admin');

        users.push({
          id: p.user_id,
          nome: p.nome_completo || "Sem nome",
          email: "",
          isAdmin,
          isClient,
          departamento: "",
          modules,
        });
      }
      console.log("[ConfiguracoesPage] Usuários carregados:", users.length, users.map(u => u.nome));
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
    try {
      const res = await supabase.functions.invoke("manage-user", {
        body: { action: "toggleModule", target_user_id: userId, module, enable: !current }
      });
      if (res.error) throw res.error;
      toast.success(`${moduleLabels[module]} ${!current ? "habilitado" : "desabilitado"}`);
      loadUsers();
    } catch (err: any) {
      console.error("Erro no toggleModule:", err);
      toast.error("Erro ao alterar módulo: " + (err.message || "Falha na requisição"));
    }
  };

  const toggleAdmin = async (userId: string, current: boolean) => {
    try {
      const res = await supabase.functions.invoke("manage-user", {
        body: { action: "toggleAdmin", target_user_id: userId, enable: !current }
      });
      if (res.error) throw res.error;
      toast.success(!current ? "Promovido a admin" : "Removido de admin");
      loadUsers();
    } catch (err: any) {
      console.error("Erro no toggleAdmin:", err);
      toast.error("Erro ao alterar permissão de admin: " + (err.message || "Falha na requisição"));
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Excluir este usuário do sistema?")) return;
    try {
      const res = await supabase.functions.invoke("manage-user", {
        body: { action: "deleteUser", target_user_id: userId }
      });
      if (res.error) throw res.error;
      toast.success("Usuário removido!");
      loadUsers();
    } catch (err: any) {
      console.error("Erro no handleDelete:", err);
      toast.error("Erro ao excluir usuário: " + (err.message || "Falha na requisição"));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-card-foreground">Gerenciamento de Usuários</h3>
        <button onClick={() => navigate("/configuracoes/usuarios/novo")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('interna')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors ${activeTab === 'interna' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Users size={18} /> Equipe Interna
        </button>
        <button
          onClick={() => setActiveTab('cliente')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors ${activeTab === 'cliente' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Building size={18} /> Portal Cliente
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors ${activeTab === 'auditoria' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Shield size={18} /> Auditoria do Sistema
        </button>
      </div>

      {activeTab === 'auditoria' ? (
        <AuditoriaPage />
      ) : (
        <>
          <div className="space-y-4">
            {usuarios.filter(u => activeTab === 'interna' ? !u.isClient : u.isClient).map(u => (
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
                {activeTab === 'interna' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-4 pt-4 border-t border-border">
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
                )}
              </div>
            ))}
            {loadingUsers ? (
              <div className="module-card text-center py-8">
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : usuarios.filter(u => activeTab === 'interna' ? !u.isClient : u.isClient).length === 0 ? (
              <div className="module-card text-center py-8">
                <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-6 pt-6 border-t border-border">
            <h3 className="text-lg font-bold text-card-foreground">Configurações de Notificações</h3>
            <NotificationConfig />
          </div>
        </>
      )}
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
