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
  email_alertas?: string;
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
  tarefas: "Tarefas",
  ocorrencias: "Ocorrências",
  documentos: "Assinaturas",
  recibos: "Recibos",
  simulador: "Simulador",
  irpf: "IRPF",
  declaracoes_anuais: "Declarações Anuais",
  declaracoes_mensais: "Declarações Mensais",
  relatorios: "Relatórios",
};

const ConfiguracoesPage: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'interna' | 'cliente' | 'auditoria'>('interna');
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailAlertasInput, setEmailAlertasInput] = useState<string>("");

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

        // A user is a client if they have the 'client' role. 
        // Presence in enterprise access for a 'user' role means restriction, not client status.
        const isClient = userRoles.includes('client');
        const isAdmin = userRoles.includes('admin');

        users.push({
          id: p.user_id,
          nome: p.nome_completo || "Sem nome",
          email: "",
          email_alertas: p.email_alertas || "",
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
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Usuário removido!");
      loadUsers();
    } catch (err: any) {
      console.error("Erro no handleDelete:", err);
      toast.error("Erro ao excluir usuário: " + (err.message || "Falha na requisição"));
    }
  };

  const handleUpdateEmailAlertas = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ email_alertas: emailAlertasInput })
        .eq("user_id", userId);

      if (error) throw error;
      
      toast.success("E-mail de alertas atualizado com sucesso!");
      setEditingEmailId(null);
      loadUsers();
    } catch (err: any) {
      console.error("Erro:", err);
      toast.error("Erro ao atualizar e-mail: " + err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="header-title text-3xl font-black tracking-tight text-foreground">
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de acessos, permissões e configurações do sistema.
          </p>
        </div>
        <button onClick={() => navigate("/configuracoes/usuarios/novo")} className="button-premium">
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="flex border-b border-border overflow-x-auto no-scrollbar pt-2">
        <button
          onClick={() => setActiveTab('interna')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'interna' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} /> Equipe Interna
          </div>
        </button>
        <button
          onClick={() => setActiveTab('cliente')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'cliente' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <Building size={16} /> Portal Cliente
          </div>
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'auditoria' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} /> Auditoria do Sistema
          </div>
        </button>
      </div>

      {activeTab === 'auditoria' ? (
        <AuditoriaPage />
      ) : (
        <>
          <div className="space-y-4">
            {usuarios.filter(u => activeTab === 'interna' ? !u.isClient : u.isClient).map(u => (
              <div key={u.id} className="card-premium">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                      <span className="text-primary text-lg font-black">{(u.nome || "U").slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-black text-card-foreground text-lg">{u.nome || "Sem nome"} {u.isAdmin && <span className="ml-2 badge-status badge-success text-[10px] uppercase align-middle">Admin</span>}</p>
                      <p className="text-sm font-medium text-muted-foreground mt-0.5">{u.email} {u.departamento ? <span className="text-primary ml-2">• {u.departamento}</span> : ""}</p>
                      
                      {/* Interface de E-mail de Alertas para Clientes */}
                      {u.isClient && (
                         <div className="mt-2">
                           {editingEmailId === u.id ? (
                             <div className="flex items-center gap-2">
                               <input 
                                 type="email"
                                 autoFocus
                                 className="px-3 py-1 text-sm border border-border rounded-lg bg-background w-64 focus:ring-1 focus:ring-primary outline-none"
                                 placeholder="alerta@empresa.com"
                                 value={emailAlertasInput}
                                 onChange={(e) => setEmailAlertasInput(e.target.value)}
                                 onKeyDown={(e) => e.key === 'Enter' && handleUpdateEmailAlertas(u.id)}
                               />
                               <button onClick={() => handleUpdateEmailAlertas(u.id)} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-bold hover:opacity-90 transition-opacity">
                                 Salvar
                               </button>
                               <button onClick={() => setEditingEmailId(null)} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
                                 <X size={16} />
                               </button>
                             </div>
                           ) : (
                             <div className="flex items-center gap-2">
                               <span className="text-xs font-semibold text-muted-foreground">E-mail para Alertas Automáticos:</span>
                               <span className={u.email_alertas ? "text-xs font-bold text-foreground" : "text-xs italic text-muted-foreground opacity-70"}>
                                 {u.email_alertas || "Não configurado"}
                               </span>
                               <button onClick={() => { setEditingEmailId(u.id); setEmailAlertasInput(u.email_alertas || ""); }} className="text-[10px] uppercase tracking-wider font-bold text-primary hover:underline ml-1">
                                 Alterar
                               </button>
                             </div>
                           )}
                         </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-border/50">
                    <button 
                      onClick={() => toggleAdmin(u.id, u.isAdmin)} 
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${u.isAdmin ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20" : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`} 
                      title={u.isAdmin ? "Remover admin" : "Tornar admin"}
                    >
                      {u.isAdmin ? <Shield size={16} /> : <ShieldOff size={16} />}
                      {u.isAdmin ? 'Administrador' : 'Tornar Admin'}
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)} 
                      className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-transparent hover:border-destructive/20"
                      title="Excluir Usuário"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {activeTab === 'interna' && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.15em] mb-4">Permissões de Módulos</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {Object.entries(moduleLabels).map(([key, label]) => {
                        const hasAccess = u.isAdmin || u.modules?.[key];
                        return (
                          <button
                            key={key}
                            disabled={u.isAdmin}
                            onClick={() => toggleModule(u.id, key, u.modules?.[key] || false)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${hasAccess
                              ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                              : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30"
                              } ${u.isAdmin ? "opacity-70 cursor-not-allowed" : ""}`}
                          >
                            <span className="truncate pr-2">{label}</span>
                            {hasAccess && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loadingUsers ? (
              <div className="card-premium text-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto opacity-50 mb-3" />
                <p className="text-muted-foreground font-bold">Carregando equipe...</p>
              </div>
            ) : usuarios.filter(u => activeTab === 'interna' ? !u.isClient : u.isClient).length === 0 ? (
              <div className="card-premium text-center py-16">
                <div className="p-4 rounded-full bg-muted/10 w-fit mx-auto mb-4">
                  <Users size={32} className="text-muted-foreground opacity-50" />
                </div>
                <p className="text-lg font-black text-card-foreground">Nenhum usuário encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">Você pode adicionar novos usuários clicando no botão acima.</p>
              </div>
            ) : null}
          </div>

          <div className="pt-8">
            <h3 className="header-title text-2xl font-black mb-6 flex items-center gap-3">
              <div className="w-1 h-6 bg-primary rounded-full" />
              Configurações de Notificações
            </h3>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {types.map((t) => (
        <div key={t.id} className="card-premium flex items-center justify-between gap-4 p-5 hover:border-primary/30 transition-colors">
          <div className="flex-1">
            <p className="text-base font-black text-foreground">{t.label}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1 leading-relaxed">
              {t.description}
            </p>
          </div>
          <button
            onClick={() => toggleType(t.id, t.is_enabled)}
            className={`w-14 h-7 rounded-full transition-colors relative shrink-0 ${
              t.is_enabled ? "bg-primary shadow-sm shadow-primary/20" : "bg-muted-foreground/30"
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
                t.is_enabled ? "left-8" : "left-1"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ConfiguracoesPage;
