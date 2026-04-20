import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Trash2, Shield, ShieldOff, Plus, CheckCircle2, Users, Building,
  Palette, Layout, Flag, Image as LucideImage, Globe, Save, UserCheck, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import AuditoriaPage from "./AuditoriaPage";
import { useAppConfig } from "@/hooks/useAppConfig";
import { SidebarCustomizer } from "@/components/SidebarCustomizer";
import { ColorCustomizer } from "@/components/ColorCustomizer";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  email_alertas?: string;
  isAdmin: boolean;
  isClient: boolean;
  modules: any;
  empresa_id?: string;
  empresa_nome?: string;
  cnpj?: string;
  ativo?: boolean;
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
  const { config, updateConfig, loading: configLoading } = useAppConfig();
  
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Usuario[]>([]);
  const [listaEmpresas, setListaEmpresas] = useState<any[]>([]); // New state for linking
  const [consents, setConsents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<LegalDoc[]>([]);
  const [editingDoc, setEditingDoc] = useState<LegalDoc | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'interna' | 'cliente' | 'auditoria' | 'lgpd' | 'personalizacao'>('interna');

  // Local state for branding edits
  const [brandForm, setBrandForm] = useState({
    system_title: "",
    system_logo_url: "",
    welcome_message: ""
  });

  useEffect(() => {
    if (config) {
      setBrandForm({
        system_title: config.system_title,
        system_logo_url: config.system_logo_url,
        welcome_message: config.welcome_message
      });
    }
  }, [config]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      
      // 1. Fetch all raw data first
      const [
        { data: profiles },
        { data: allEmpresasData },
        { data: userAccess },
        { data: consentsData },
        { data: roles },
        { data: perms },
        { data: docsData }
      ] = await Promise.all([
        supabase.from("profiles").select("*").neq('ativo', false),
        supabase.from("empresas").select("id, nome_empresa, cnpj").order('nome_empresa'),
        supabase.from("empresa_acessos").select("user_id, empresa_id, empresas(nome_empresa, cnpj)"),
        supabase.from("user_consents").select('*, legal_documents(title)').order('created_at', { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_module_permissions").select("user_id, module_name"),
        supabase.from("legal_documents").select("*").eq("is_active", true)
      ]);

      setListaEmpresas(allEmpresasData || []);
      setDocuments(docsData || []);

      // 2. Build lookups
      const accessByUserId: Record<string, any> = (userAccess || []).reduce((acc: any, curr: any) => {
        acc[curr.user_id] = {
          empresa_id: curr.empresa_id,
          nome_empresa: curr.empresas?.nome_empresa,
          cnpj: curr.empresas?.cnpj
        };
        return acc;
      }, {});

      const rolesByUserId: Record<string, string[]> = (roles || []).reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id]) acc[curr.user_id] = [];
        acc[curr.user_id].push(curr.role);
        return acc;
      }, {});

      const permsByUserId: Record<string, string[]> = (perms || []).reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id]) acc[curr.user_id] = [];
        acc[curr.user_id].push(curr.module_name);
        return acc;
      }, {});

      const profilesMap: Record<string, any> = (profiles || []).reduce((acc: any, curr: any) => {
        acc[curr.user_id] = curr;
        return acc;
      }, {});

      const usersByEmpresaId: Record<string, any> = (userAccess || []).reduce((acc: any, curr: any) => {
        acc[curr.empresa_id] = profilesMap[curr.user_id] ? {
          ...profilesMap[curr.user_id],
          is_authenticated: true
        } : null;
        return acc;
      }, {});

      // 3. Map complex objects using lookups
      const mappedUsers: Usuario[] = (profiles || []).map((p: any) => {
        const userRoles = rolesByUserId[p.user_id] || [];
        const userPerms = permsByUserId[p.user_id] || [];
        const access = accessByUserId[p.user_id] || {};
        const modules: Record<string, boolean> = {};
        userPerms.forEach((m: string) => { modules[m] = true; });

        return {
          id: p.user_id,
          nome: p.full_name || p.nome_completo || "Sem nome",
          email: "",
          isAdmin: userRoles.includes('admin') || userRoles.includes('SUPER_ADMIN'),
          isClient: userRoles.includes('client'),
          modules,
          email_alertas: p.email_alertas || "",
          empresa_id: access.empresa_id,
          empresa_nome: access.nome_empresa,
          cnpj: access.cnpj,
          ativo: p.ativo !== false
        };
      });

      const mappedConsents = (consentsData || []).map((c: any) => ({
        ...c,
        nome_documento: c.legal_documents?.title || c.document_id,
        profile: profilesMap[c.user_id] ? {
          nome_completo: profilesMap[c.user_id].full_name || profilesMap[c.user_id].nome_completo
        } : null
      }));

      // 4. Update states
      // SEPARAÇÃO DEFINITIVA: Equipe Interna mostra apenas os 5 membros principais da imagem ou admins.
      // Todo o resto é tratado como "Portal Cliente" (Empresas).
      const CORE_TEAM_IDS = [
        '04b72899-9f97-43d3-ba38-cb027a04f24f', // Aliciane
        '10e3e55a-2387-446e-bdae-e064a30db82e', // Tânia
        '7c61f24f-155e-4100-b790-5b421d949293', // Silvana
        '94abd338-0554-43e2-b781-b64ce0395d60', // Juliana
        'e29dceeb-ef3a-4085-8ba9-dc10f5687f21'  // Rafael
      ];

      // Filtro 100% estrito: mostra apenas quem está na lista da imagem
      setUsuarios(mappedUsers.filter(u => CORE_TEAM_IDS.includes(u.id)));
      
      // Portal Cliente: Foco total nas empresas
      const companyPortalList = (allEmpresasData || []).map(emp => ({
        ...emp,
        user: usersByEmpresaId[emp.id] || null
      }));
      setEmpresas(companyPortalList as any); 

      setConsents(mappedConsents);

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast.error("Erro ao sincronizar dados de usuários.");
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
      if (current) {
        // Remover permissão
        const { error } = await supabase
          .from("user_module_permissions")
          .delete()
          .eq("user_id", targetId)
          .eq("module_name", module);
        if (error) throw error;
      } else {
        // Adicionar permissão
        const { error } = await supabase
          .from("user_module_permissions")
          .insert({ user_id: targetId, module_name: module });
        if (error) throw error;
      }
      
      toast.success(`${moduleLabels[module]} atualizado`);
      loadUsers();
    } catch (err: any) {
      console.error("Erro ao alterar módulo:", err);
      toast.error("Erro ao alterar módulo. Verifique as permissões.");
    }
  };

  const toggleAdmin = async (userId: string, current: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { 
          action: 'toggleAdmin', 
          target_user_id: userId, 
          enable: !current 
        }
      });

      if (error) throw error;
      
      toast.success(!current ? "Promovido a admin" : "Removido de admin");
      loadUsers();
    } catch (err: any) {
      console.error("Erro toggleAdmin (Edge Function):", err);
      // Fallback para DB direto se a função falhar (tentativa)
      try {
        if (current) {
          await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        } else {
          await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: 'user_id,role' });
        }
        loadUsers();
      } catch (dbErr) {
        toast.error("Erro ao alterar privilégios de admin");
      }
    }
  };

  const switchUserType = async (userId: string, toClient: boolean) => {
    try {
      // Tenta via Edge Function primeiro (mais seguro para auth)
      const { error } = await supabase.functions.invoke('manage-user', {
        body: { 
          action: 'toggleUserType', 
          target_user_id: userId, 
          role: toClient ? 'client' : 'user' 
        }
      });

      if (error) throw error;
      
      toast.success(toClient ? "Usuário movido para Portal Cliente" : "Usuário movido para Equipe Interna");
      
      if (!toClient) {
        await supabase.from("empresa_acessos").delete().eq("user_id", userId);
      }
      
      loadUsers();
    } catch (err: any) {
      console.error("Erro switchUserType (Edge Function):", err);
      
      // Fallback para DB direto em caso de 401 ou erro da função
      try {
        if (toClient) {
          // Adiciona papel de client e vincula (apenas DB)
          await supabase.from("user_roles").upsert({ user_id: userId, role: "client" }, { onConflict: 'user_id,role' });
        } else {
          // Remove papel de client e limpa vínculos
          await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "client");
          await supabase.from("empresa_acessos").delete().eq("user_id", userId);
        }
        toast.success("Tipo de usuário alterado via Banco de Dados.");
        loadUsers();
      } catch (dbErr) {
        toast.error("Erro crítico ao trocar tipo. Verifique logs.");
      }
    }
  };

  const linkCompany = async (userId: string, empresaId: string) => {
    try {
      // Remover vínculo anterior explicitamente
      await supabase.from("empresa_acessos").delete().eq("user_id", userId);
      
      // Inserir novo vínculo
      const { error } = await supabase.from("empresa_acessos").insert({
        user_id: userId,
        empresa_id: empresaId,
        modulos_permitidos: Object.keys(moduleLabels)
      });
      
      if (error) throw error;
      toast.success("Empresa vinculada com sucesso!");
      loadUsers();
    } catch (err: any) {
      console.error("Erro linkCompany:", err);
      toast.error("Erro ao vincular empresa");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!userId) return;
    if (!window.confirm("Excluir definitivamente este usuário e todos os seus dados? Esta ação não pode ser desfeita.")) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { 
          action: 'deleteUser', 
          target_user_id: userId 
        }
      });

      if (error) throw error;
        
      toast.success("Usuário excluído permanentemente.");
      loadUsers();
    } catch (err: any) {
      console.error("Erro ao excluir usuário (Edge Function):", err);
      // Fallback para Inativação se a exclusão total falhar
      try {
        await supabase.from("profiles").update({ ativo: false }).eq("user_id", userId);
        toast.info("Usuário apenas inativado devido a restrições de permissão.");
        loadUsers();
      } catch (fallbackErr) {
        toast.error("Erro ao processar exclusão.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
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
          onClick={() => setActiveTab('personalizacao')} 
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'personalizacao' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Palette size={16} /> Personalizar Sistema
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
      ) : activeTab === 'personalizacao' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Identidade Visual */}
          <div className="card-premium">
            <h3 className="text-lg font-black text-card-foreground mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
              <LucideImage className="text-primary" size={20} />
              Identidade Visual do Portal
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground mb-2 block tracking-widest">Nome do Sistema</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                      <Flag size={18} />
                    </div>
                    <input 
                      className="w-full bg-muted/30 border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 p-4 pl-12 rounded-2xl text-sm font-bold transition-all outline-none"
                      value={brandForm.system_title}
                      onChange={(e) => setBrandForm({...brandForm, system_title: e.target.value})}
                      placeholder="Ex: Audipreve Contabilidade"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground mb-2 block tracking-widest">URL do Logotipo (PNG/SVG)</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                      <Globe size={18} />
                    </div>
                    <input 
                      className="w-full bg-muted/30 border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 p-4 pl-12 rounded-2xl text-sm font-bold transition-all outline-none"
                      value={brandForm.system_logo_url}
                      onChange={(e) => setBrandForm({...brandForm, system_logo_url: e.target.value})}
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground mb-2 block tracking-widest">Mensagem de Boas-vindas</label>
                  <textarea 
                    className="w-full bg-muted/30 border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 p-4 rounded-2xl text-sm font-medium transition-all outline-none min-h-[100px]"
                    value={brandForm.welcome_message}
                    onChange={(e) => setBrandForm({...brandForm, welcome_message: e.target.value})}
                    placeholder="Mensagem exibida na tela de login..."
                  />
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => updateConfig(brandForm)}
                    className="button-premium group flex items-center gap-2"
                  >
                    <Save size={18} className="group-hover:rotate-12 transition-transform" />
                    Salvar Identidade
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-8 bg-muted/20 border border-dashed border-border rounded-3xl relative overflow-hidden">
                <div className="absolute top-4 left-4 text-[10px] font-black uppercase text-muted-foreground opacity-30">Preview do Logo</div>
                {brandForm.system_logo_url ? (
                  <img src={brandForm.system_logo_url} alt="Preview" className="max-w-[200px] max-h-[80px] object-contain drop-shadow-md" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground/30">
                    <LucideImage size={64} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">Nenhum logo externo definido<br/>(Usando padrão local)</p>
                  </div>
                )}
                <div className="mt-8 text-center">
                  <p className="text-xl font-bold text-card-foreground">{brandForm.system_title || "Audipreve"}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Slogan ou Descrição</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Customização de Cores */}
            <div className="card-premium h-fit">
              <h3 className="text-lg font-black text-card-foreground mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
                <Palette className="text-primary" size={20} />
                Cores do Sistema
              </h3>
              <ColorCustomizer />
            </div>

            {/* Customização de Sidebar */}
              <div className="card-premium">
              <h3 className="text-lg font-black text-card-foreground mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
                <Layout className="text-primary" size={20} />
                Menu de Navegação
              </h3>
              <SidebarCustomizer />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'interna' ? usuarios : empresas).map((item: any) => (
            <div key={item.id} className="card-premium">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-all ${
                    activeTab === 'interna' 
                      ? "bg-primary/10 border-primary/20 text-primary" 
                      : (item.user ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-muted border-transparent text-muted-foreground")
                  }`}>
                    {activeTab === 'interna' 
                      ? <Users size={20} /> 
                      : (item.user ? <UserCheck size={20} /> : <Building size={20} />)
                    }
                  </div>
                  <div>
                    <p className="font-black text-card-foreground text-lg flex items-center gap-2">
                      {activeTab === 'interna' ? item.nome : item.nome_empresa}
                      {activeTab === 'interna' && item.isAdmin && <span className="badge-status badge-success text-[10px] uppercase align-middle">Admin</span>}
                      {activeTab === 'interna' && !item.isAdmin && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase tracking-widest border border-blue-500/20">Colaborador</span>}
                      {activeTab === 'cliente' && (
                        item.user 
                          ? <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">Autenticado</span>
                          : <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-widest border border-transparent">Apenas Cadastro</span>
                      )}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">
                      {activeTab === 'interna' ? "Equipe Audipreve • Sem vínculos externos" : `CNPJ: ${item.cnpj}`}
                      {activeTab === 'cliente' && item.user && (
                        <span className="ml-2 text-primary/60 font-bold">• Login Vinculado: {item.user.full_name || item.user.nome_completo}</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {activeTab === 'interna' && (
                    <>
                      <button 
                        onClick={() => toggleAdmin(item.id, item.isAdmin)} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${item.isAdmin ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"}`}
                        title={item.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                      >
                        {item.isAdmin ? <Shield size={16} /> : <ShieldOff size={16} />}
                        {item.isAdmin ? 'Admin' : 'Tornar Admin'}
                      </button>

                      <button 
                        onClick={() => switchUserType(item.id, true)} 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-muted border border-transparent text-muted-foreground hover:bg-muted/80 transition-all"
                        title="Mover para Portal Cliente"
                      >
                        <Building size={16} /> Tornar Cliente
                      </button>
                    </>
                  )}

                  {activeTab === 'cliente' && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground/40 hidden md:block">Vincular:</span>
                        <select 
                          className="bg-muted border border-border/50 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          value={item.user?.user_id || ""}
                          onChange={(e) => linkCompany(e.target.value, item.id)}
                        >
                          <option value="">Nenhum Usuário...</option>
                          {usuarios.map(u => (
                            <option key={u.id} value={u.id}>{u.nome}</option>
                          ))}
                        </select>
                      </div>

                      {item.user && (
                        <button 
                          onClick={() => switchUserType(item.user.user_id, false)} 
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-muted border border-transparent text-muted-foreground hover:bg-muted/80 transition-all"
                          title="Mover para Equipe Interna"
                        >
                          <Users size={16} /> Tornar Equipe
                        </button>
                      )}
                    </>
                  )}

                  <button 
                    onClick={() => handleDelete(activeTab === 'interna' ? item.id : item.user?.user_id)} 
                    disabled={activeTab === 'cliente' && !item.user}
                    className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all shadow-sm disabled:opacity-20 disabled:grayscale"
                    title="Excluir/Inativar Usuário"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {/* Módulos de Acesso */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.15em] mb-4">
                  {activeTab === 'interna' ? 'Permissões de Módulos' : 'Módulos Habilitados para a Empresa'}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Object.entries(moduleLabels).map(([key, label]) => {
                    const targetUser = activeTab === 'interna' ? item : item.user;
                    const hasAccess = targetUser?.isAdmin || targetUser?.modules?.[key];
                    
                    return (
                      <button 
                        key={key} 
                        disabled={(activeTab === 'interna' && item.isAdmin) || (activeTab === 'cliente' && !item.user)} 
                        onClick={() => toggleModule(targetUser.id, key, !!targetUser.modules?.[key])} 
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${hasAccess ? "border-primary/40 bg-primary/10 text-primary shadow-sm" : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/20"} ${(activeTab === 'interna' && item.isAdmin) || (activeTab === 'cliente' && !item.user) ? "opacity-70 cursor-not-allowed" : ""}`}
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
