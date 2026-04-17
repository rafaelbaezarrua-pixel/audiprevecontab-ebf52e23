import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Shield, ShieldOff, Plus, CheckCircle2, Users, Building } from "lucide-react";
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
  modules: any;
  cnpj?: string;
}

interface LegalDoc {
  id: string;
  type: string;
  title: string;
  content: string;
  version: string;
  is_active: boolean;
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
  const [documents, setDocuments] = useState<LegalDoc[]>([]);
  const [editingDoc, setEditingDoc] = useState<LegalDoc | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'interna' | 'cliente' | 'auditoria' | 'lgpd'>('interna');

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: empresasData } = await supabase.from("empresas").select("*").order('nome_empresa');
      
      // Carregar aceites LGPD
      const { data: consentsData } = await supabase
        .from("user_consents")
        .select('*, legal_documents(title)')
        .order('created_at', { ascending: false });

      // Carregar Documentos Atuais
      const { data: docsData } = await supabase
        .from("legal_documents")
        .select("*")
        .eq("is_active", true);

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

      // Mapear Usuários
      const mappedUsers: Usuario[] = (profiles || []).map((p: any) => {
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

      // Equipe Interna
      const internalTeam = mappedUsers.filter(u => !u.isClient);
      setUsuarios(internalTeam);

      // Portal Cliente (Usuários, não empresas)
      const portalClients = mappedUsers.filter(u => u.isClient);
      setEmpresas(portalClients); // Usa a mesma variável de state para exibir na aba cliente

      // Mapear Consents para a aba LGPD
      const mappedConsents = (consentsData || []).map((c: any) => ({
        ...c,
        nome_documento: c.legal_documents?.title || c.document_id,
        profile: profilesMap[c.user_id] ? {
          nome_completo: profilesMap[c.user_id].full_name || profilesMap[c.user_id].nome_completo
        } : null
      }));
      setConsents(mappedConsents);
      setDocuments(docsData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSaveDocument = async () => {
    if (!editingDoc) return;
    try {
      const { error } = await supabase
        .from("legal_documents")
        .update({ 
          title: editingDoc.title, 
          content: editingDoc.content,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingDoc.id);

      if (error) throw error;
      toast.success("Documento atualizado com sucesso!");
      setEditingDoc(null);
      loadUsers();
    } catch (err: any) {
      toast.error("Erro ao salvar documento");
    }
  };

  const releaseVersion = async (doc: LegalDoc) => {
    if (!window.confirm(`Deseja lançar a versão ${doc.version} como obrigatória para todos? Isso fará com que todos os usuários tenham que aceitar novamente.`)) return;
    try {
      // Cria uma nova versão baseada na atual (ex: v1.0 -> v1.1)
      const currentV = parseFloat(doc.version.replace('v', '')) || 1.0;
      const nextVersion = `v${(currentV + 0.1).toFixed(1)}`;
      
      const { error } = await supabase.rpc('release_document_update', {
        doc_type: doc.type,
        doc_title: doc.title,
        doc_content: doc.content,
        new_version: nextVersion
      });

      if (error) throw error;
      toast.success(`Versão ${nextVersion} lançada com sucesso!`);
      loadUsers();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao lançar atualização. Verifique se a função rpc existe no banco.");
    }
  };

  if (!userData) return null;
  if (!userData.isAdmin) return <Navigate to="/dashboard" replace />;

  const toggleModule = async (targetId: string, module: string, current: boolean) => {
    try {
      const res = await supabase.functions.invoke("manage-user", {
        body: { action: "toggleModule", target_user_id: targetId, module, enable: !current }
      });
      if (res.error) throw res.error;
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
        <div className="space-y-8">
          {/* Painel de Documentos Ativos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documents.map((doc) => (
              <div key={doc.id} className="card-premium border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-1">{doc.type.replace(/_/g, ' ')}</h4>
                    <p className="text-lg font-bold text-card-foreground">{doc.title}</p>
                    <span className="badge-status badge-success text-[10px] uppercase mt-2">{doc.version} - Ativa</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingDoc(doc)}
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-all"
                      title="Savar rascunho"
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      onClick={() => releaseVersion(doc)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20"
                    >
                      <Plus size={14} /> Lançar Atualização
                    </button>
                  </div>
                </div>
                <div className="bg-black/20 p-4 rounded-xl max-h-32 overflow-y-auto text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {doc.content.substring(0, 300)}...
                </div>
              </div>
            ))}
          </div>

          {/* Modal de Edição (Condicional) */}
          {editingDoc && (
            <div className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase tracking-tight">Editar Documento Legal</h3>
                  <button onClick={() => setEditingDoc(null)} className="text-muted-foreground hover:text-foreground">Fechar</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground mb-2 block">Título do Documento</label>
                    <input 
                      className="w-full bg-muted border border-border p-4 rounded-xl text-sm font-bold"
                      value={editingDoc.title}
                      onChange={(e) => setEditingDoc({...editingDoc, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground mb-2 block">Conteúdo Jurídico</label>
                    <textarea 
                      className="w-full bg-muted border border-border p-4 rounded-xl text-sm h-96 font-medium leading-relaxed"
                      value={editingDoc.content}
                      onChange={(e) => setEditingDoc({...editingDoc, content: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setEditingDoc(null)} className="px-6 py-3 rounded-xl text-sm font-bold bg-muted hover:bg-muted/80 transition-all">Cancelar</button>
                  <button onClick={handleSaveDocument} className="px-8 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-all">Salvar Alterações</button>
                </div>
              </div>
            </div>
          )}

          {/* Histórico de Consentimentos */}
          <div className="card-premium">
            <h3 className="text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
              <Shield className="text-emerald-500" size={20} />
              Histórico de Aceites (Logs de Auditoria)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-[10px] uppercase font-black tracking-widest">
                    <th className="text-left pb-4">Usuário</th>
                    <th className="text-left pb-4">Documento</th>
                    <th className="text-left pb-4">Versão</th>
                    <th className="text-left pb-4">Data do Aceite</th>
                    <th className="text-left pb-4">Método</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {consents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Nenhuma prova de consentimento registrada.</td>
                    </tr>
                  ) : (
                    consents.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-4 font-bold text-card-foreground">{c.profile?.nome_completo || "Usuário Removido"}</td>
                        <td className="py-4 text-muted-foreground font-bold">{c.nome_documento}</td>
                        <td className="py-4"><span className="badge-status badge-success text-[9px]">{c.version || 'v1.0'}</span></td>
                        <td className="py-4 text-muted-foreground text-xs">
                          {new Date(c.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-4 text-muted-foreground text-[10px] font-black uppercase">{c.metodo_aceite}</td>
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

                    </>
                  )}
                  


                  <button 
                    onClick={() => handleDelete(u.id)} 
                    className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-transparent hover:border-destructive/20"
                    title="Excluir Usuário"
                  >
                    <Trash2 size={18} />
                  </button>
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
                        onClick={() => toggleModule(u.id, key, !!u.modules?.[key])} 
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
