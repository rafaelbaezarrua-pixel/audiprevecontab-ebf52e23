import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Shield, ShieldOff, Users, Building } from "lucide-react";
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
  modules: Record<string, boolean>;
  cnpj?: string;
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
  faturamento: "Faturamento",
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
  const [empresas, setEmpresas] = useState<Usuario[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'interna' | 'cliente' | 'auditoria' | 'lgpd'>('interna');

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: empresasData } = await supabase.from("empresas").select("*").order('nome_empresa');
      
      // Carregar aceites LGPD (Busca simples para evitar erro 400 de join)
      const { data: consentsData } = await supabase
        .from("user_consents")
        .select('*')
        .order('accepted_at', { ascending: false });

      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const { data: perms } = await supabase.from("user_module_permissions").select("user_id, module_name").in("user_id", userIds);

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

      const profilesMap = (profiles || []).reduce((acc: any, curr: any) => {
        acc[curr.user_id] = curr;
        return acc;
      }, {});

      // Mapear Equipe Interna
      const team: Usuario[] = (profiles || []).map((p: any) => {
        const userRoles = rolesByUserId[p.user_id] || [];
        const userPerms = permsByUserId[p.user_id] || [];
        const modules: Record<string, boolean> = {};
        userPerms.forEach((m: string) => { modules[m] = true; });

        return {
          id: p.user_id,
          nome: p.full_name || p.nome_completo || "Sem nome",
          email: "",
          isAdmin: userRoles.includes('admin'),
          isClient: userRoles.includes('client'),
          modules,
          email_alertas: p.email_alertas || "",
        };
      });

      // No momento de exibir na aba 'interna', mostramos quem NÃO for cliente
      const filteredTeam = team.filter(u => !u.isClient);
      
      setUsuarios(filteredTeam);

      // Mapear Consents para a aba LGPD com os nomes dos perfis
      const mappedConsents = (consentsData || []).map((c: any) => ({
        ...c,
        profile: profilesMap[c.user_id] ? {
          nome_completo: profilesMap[c.user_id].full_name || profilesMap[c.user_id].nome_completo
        } : null
      }));

      setConsents(mappedConsents);

      const clients: Usuario[] = (empresasData || []).map(e => {
        const modules: Record<string, boolean> = {};
        (e.modulos_ativos || []).forEach((m: string) => { modules[m] = true; });
        return {
          id: e.id,
          nome: e.nome_fantasia || e.nome_empresa,
          cnpj: e.cnpj || "",
          email: "",
          isClient: true,
          isAdmin: false,
          modules,
        };
      });

      setUsuarios(team);
      setEmpresas(clients);
      setConsents(consentsData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  if (!userData) return null;
  if (!userData.isAdmin) return <Navigate to="/dashboard" replace />;

  const toggleModule = async (targetId: string, module: string, current: boolean, isClient: boolean) => {
    try {
      if (isClient) {
        const empresa = empresas.find(e => e.id === targetId);
        if (!empresa) return;
        const currentModules = Object.keys(empresa.modules).filter(k => empresa.modules[k]);
        const newModules = !current ? [...currentModules, module] : currentModules.filter(m => m !== module);
        const { error } = await supabase.from("empresas").update({ modulos_ativos: newModules }).eq("id", targetId);
        if (error) throw error;
      } else {
        const res = await supabase.functions.invoke("manage-user", {
          body: { action: "toggleModule", target_user_id: targetId, module, enable: !current }
        });
        if (res.error) throw res.error;
      }
      toast.success(`${moduleLabels[module]} atualizado`);
      loadUsers();
    } catch (err: any) {
      toast.error("Erro ao alterar módulo");
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
      toast.error("Erro ao alterar admin");
    }
  };

  const toggleUserType = async (userId: string, currentIsClient: boolean) => {
    try {
      const newRole = currentIsClient ? "user" : "client";
      // Ao mudar para portal, remove o admin primeiro por segurança
      if (!currentIsClient) {
        await supabase.functions.invoke("manage-user", {
          body: { action: "toggleAdmin", target_user_id: userId, enable: false }
        });
      }
      
      const { error } = await supabase.from("user_roles").upsert({ 
        user_id: userId, 
        role: newRole 
      }, { onConflict: 'user_id,role' });

      if (error) throw error;

      toast.success(`Usuário movido para ${currentIsClient ? "Equipe Interna" : "Portal Cliente"}`);
      loadUsers();
    } catch (err: any) {
      toast.error("Erro ao alterar tipo de acesso");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Excluir este usuário?")) return;
    try {
      const res = await supabase.functions.invoke("manage-user", {
        body: { action: "deleteUser", target_user_id: userId }
      });
      if (res.error) throw res.error;
      toast.success("Usuário removido!");
      loadUsers();
    } catch (err: any) {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Configurações</h1>
          </div>
          <p className="subtitle-premium">Gerencie usuários, permissões, acessos ao portal e auditoria.</p>
        </div>
        <button onClick={() => navigate("/configuracoes/usuarios/novo")} className="button-premium shadow-lg shadow-primary/20">
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar w-full sm:w-auto">
        <button 
          onClick={() => setActiveTab('interna')} 
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'interna' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Users size={16} /> Equipe Interna
        </button>
        <button 
          onClick={() => setActiveTab('cliente')} 
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'cliente' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Building size={16} /> Portal Cliente
        </button>
        <button 
          onClick={() => setActiveTab('auditoria')} 
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'auditoria' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Shield size={16} /> Auditoria do Sistema
        </button>
        <button 
          onClick={() => setActiveTab('lgpd')} 
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'lgpd' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Shield size={16} className="text-emerald-500" /> Gestão LGPD
        </button>
      </div>

      {activeTab === 'auditoria' ? (
        <AuditoriaPage />
      ) : activeTab === 'lgpd' ? (
        <div className="space-y-6">
          <div className="card-premium">
            <h3 className="text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
              <Shield className="text-emerald-500" size={20} />
              Registro de Consentimentos (LGPD)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-[10px] uppercase font-black tracking-widest">
                    <th className="text-left pb-4">Usuário</th>
                    <th className="text-left pb-4">Documento</th>
                    <th className="text-left pb-4">Versão</th>
                    <th className="text-left pb-4">Data do Aceite</th>
                    <th className="text-left pb-4">IP de Origem</th>
                    <th className="text-right pb-4">Assinatura Digital</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {consents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground font-bold">Nenhum aceite registrado até o momento.</td>
                    </tr>
                  ) : (
                    consents.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-4 font-bold text-card-foreground">{c.profile?.nome_completo || "Usuário Removido"}</td>
                        <td className="py-4 text-muted-foreground">{c.document_id.replace(/_/g, ' ')}</td>
                        <td className="py-4 font-mono text-xs">{c.version}</td>
                        <td className="py-4 text-muted-foreground">
                          {new Date(c.accepted_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-4 font-mono text-xs text-primary">{c.ip_address}</td>
                        <td className="py-4 text-right">
                          <span className="inline-block max-w-[100px] truncate text-[10px] bg-muted px-2 py-1 rounded font-mono text-muted-foreground" title={c.integrity_hash}>
                            {c.integrity_hash}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-8 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                <strong>Nota Jurídica:</strong> Este registro constitui prova de consentimento livre, informado e inequívoco conforme exigido pela LGPD (Lei 13.709/2018). O Hash de Integridade garante que o registro não foi alterado após a submissão.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'interna' ? usuarios : empresas).map(u => (
            <div key={u.id} className="card-premium">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                    <span className="text-primary text-lg font-black">{(u.nome || "U").slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-black text-card-foreground text-lg">
                      {u.nome || "Sem nome"} 
                      {activeTab === 'interna' && u.isAdmin && <span className="ml-2 badge-status badge-success text-[10px] uppercase align-middle">Admin</span>}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">
                      {activeTab === 'interna' ? "Equipe Interna" : `CNPJ: ${u.cnpj}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {activeTab === 'interna' && (
                    <>
                      <button 
                        onClick={() => toggleAdmin(u.id, u.isAdmin)} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${u.isAdmin ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"}`}
                        title={u.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                      >
                        {u.isAdmin ? <Shield size={16} /> : <ShieldOff size={16} />}
                        {u.isAdmin ? 'Admin' : 'Tornar Admin'}
                      </button>

                      <button 
                        onClick={() => toggleUserType(u.id, false)} 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-warning/30 bg-warning/5 text-warning hover:bg-warning/10 transition-all"
                        title="Mover para Portal Cliente"
                      >
                        <Building size={16} /> Portal
                      </button>
                    </>
                  )}
                  
                  {u.isClient && activeTab === 'cliente' && (
                     <button 
                      onClick={() => toggleUserType(u.id, true)} 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-all"
                      title="Mover para Equipe Interna"
                    >
                      <Users size={16} /> Equipe
                    </button>
                  )}

                  {activeTab === 'interna' && (
                    <button 
                      onClick={() => handleDelete(u.id)} 
                      className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-transparent hover:border-destructive/20"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.15em] mb-4">
                  {activeTab === 'interna' ? 'Permissões de Módulos' : 'Módulos Habilitados para a Empresa'}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Object.entries(moduleLabels).map(([key, label]) => {
                    const hasAccess = u.isAdmin || u.modules?.[key];
                    return (
                      <button 
                        key={key} 
                        disabled={activeTab === 'interna' && u.isAdmin} 
                        onClick={() => toggleModule(u.id, key, !!u.modules?.[key], activeTab === 'cliente')} 
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${hasAccess ? "border-primary/40 bg-primary/10 text-primary shadow-sm" : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/20"} ${activeTab === 'interna' && u.isAdmin ? "opacity-70 cursor-not-allowed" : ""}`}
                      >
                        <span className="truncate pr-2">{label}</span>
                        {hasAccess && <div className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm shadow-primary/40" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          {loadingUsers && (
            <div className="text-center py-20 bg-card/10 rounded-2xl border border-dashed border-border/50">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sincronizando registros...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfiguracoesPage;
