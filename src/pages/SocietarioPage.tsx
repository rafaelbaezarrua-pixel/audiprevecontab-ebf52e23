import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Edit2, Trash2, Eye, Building2, Filter,
  ChevronDown, Activity, Clock, CheckCircle, AlertCircle,
  FileText, ArrowRight, History, X, Check, ChevronUp, User, MessageSquare,
  Star
} from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/PageSkeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { syncCompanyClients } from "@/lib/sync-clients";
import { RefreshCw } from "lucide-react";

interface Empresa {
  id: string; nome_empresa: string; cnpj: string | null; regime_tributario: string | null;
  situacao: string | null; porte_empresa: string | null; natureza_juridica: string | null;
  data_abertura: string | null; created_at: string | null; socios_count?: number;
}

interface DetalhesPasso {
  enviado_por?: string;
  observacoes?: string;
}

interface HistoricoProcesso {
  id: string;
  processo_id: string;
  usuario_id: string;
  acao: string;
  detalhes: string | null;
  created_at: string;
}

interface Processo {
  id: string; 
  tipo: string; 
  nome_empresa: string | null; 
  empresa_id: string | null;
  numero_processo: string | null; 
  data_inicio: string; 
  status: string;
  envio_dbe_at: string | null; 
  envio_fcn_at: string | null; 
  envio_contrato_at: string | null;
  envio_taxa_at: string | null; 
  assinatura_contrato_at: string | null;
  arquivamento_junta_at: string | null; 
  foi_deferido: boolean; 
  foi_arquivado: boolean;
  em_exigencia: boolean; 
  exigencia_motivo: string | null; 
  exigencia_respondida: boolean;
  detalhes_passos: Record<string, DetalhesPasso>;
  eventos?: string[];
  current_step?: string;
  dbe_deferido?: boolean;
  assinatura_deferida?: boolean;
  indeferimento_motivo?: string;
  voltar_para?: string;
  historico?: HistoricoProcesso[];
}

const regimeLabels: Record<string, string> = {
  simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI",
};
const situacaoConfig: Record<string, { label: string; cls: string }> = {
  ativa: { label: "Ativa", cls: "badge-success" },
  paralisada: { label: "Paralisada", cls: "badge-warning" },
  baixada: { label: "Baixada", cls: "badge-danger" },
};

const tipoProcessoLabels: Record<string, string> = {
  abertura: "Abertura de Empresa",
  alteracao: "Alteração de Empresa",
  baixa: "Baixa de Empresa",
  abertura_mei: "Abertura de MEI",
  baixa_mei: "Baixa de MEI",
};

const eventosAlteracao = [
  "Alteração da forma de atuação",
  "Alteração da natureza jurídica",
  "Alteração de atividades econômicas (principal e secundárias)",
  "Alteração de capital social e/ou Quadro Societário",
  "Alteração de dados cadastrais",
  "Alteração de endereço entre municípios no mesmo estado",
  "Alteração de endereço no mesmo município",
  "Alteração de exercício das atividades econômicas",
  "Alteração de nome empresarial (firma ou denominação)",
  "Alteração do tipo de unidade",
  "Enquadramento / Reenquadramento / Desenquadramento de Porte de Empresa"
];

const passosConfig = [
  { id: 'envio_dbe_at', label: 'Envio do DBE' },
  { id: 'envio_fcn_at', label: 'Envio da FCN' },
  { id: 'envio_contrato_at', label: 'Envio do Contrato' },
  { id: 'envio_taxa_at', label: 'Envio da Taxa' },
  { id: 'assinatura_contrato_at', label: 'Assinatura' },
  { id: 'arquivamento_junta_at', label: 'Arquivamento' },
];

const ControlledInput = ({ value, onBlur, placeholder, className, type = "text" }: { value: string, onBlur: (v: string) => void, placeholder?: string, className?: string, type?: string }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  return (
    <input
      type={type}
      value={localValue || ''}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => { if (localValue !== value) onBlur(localValue); }}
      placeholder={placeholder}
      className={className}
    />
  );
};

const ControlledTextarea = ({ value, onBlur, placeholder, className, rows }: { value: string, onBlur: (v: string) => void, placeholder?: string, className?: string, rows?: number }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  return (
    <textarea
      value={localValue || ''}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => { if (localValue !== value) onBlur(localValue); }}
      placeholder={placeholder}
      className={className}
      rows={rows}
    />
  );
};

const SocietarioPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeMainTab, setActiveMainTab] = useState<"empresas" | "processos">("empresas");
  const [isFavorite, setIsFavorite] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSituacao, setFilterSituacao] = useState("todas");
  const [filterRegime, setFilterRegime] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"ativas" | "paralisadas" | "baixadas" | "mei">("ativas");
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [novoProcessoData, setNovoProcessoData] = useState({ 
    tipo: 'abertura', 
    nome_empresa: '', 
    empresa_id: null as string | null,
    numero_processo: '', 
    data_inicio: new Date().toISOString().split('T')[0],
    eventos: [] as string[]
  });
  const [expandedProcesso, setExpandedProcesso] = useState<string | null>(null);
  const [processTab, setProcessTab] = useState<Record<string, 'timeline' | 'historico'>>({});
  const [processoToDelete, setProcessoToDelete] = useState<{ id: string, nome: string } | null>(null);

  const navigate = useNavigate();

  const { data: empresas = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("*").order("nome_empresa");
      const { data: sociosData } = await supabase.from("socios").select("empresa_id");
      const sociosCounts: Record<string, number> = {};
      sociosData?.forEach(s => { sociosCounts[s.empresa_id] = (sociosCounts[s.empresa_id] || 0) + 1; });
      return (data || []).map(e => ({ ...e, socios_count: sociosCounts[e.id] || 0 })) as Empresa[];
    }
  });

  const { data: processos = [], isLoading: loadingProcessos } = useQuery({
    queryKey: ["processos_societarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos_societarios" as any)
        .select(`
          *,
          historico:processos_societarios_historico(*)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data as unknown as Processo[]) || [];
    }
  });

  const loadingInitial = loadingEmpresas || loadingProcessos;

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase.channel("societario_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "empresas" }, () => queryClient.invalidateQueries({ queryKey: ["empresas"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "processos_societarios" as any }, () => queryClient.invalidateQueries({ queryKey: ["processos_societarios"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const addHistorico = async (processoId: string, acao: string, detalhes?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("processos_societarios_historico" as any).insert({
      processo_id: processoId,
      usuario_id: user.id,
      acao,
      detalhes
    });
  };

  const handleCreateProcesso = async () => {
    if (novoProcessoData.tipo === 'alteracao' && !novoProcessoData.empresa_id) {
      toast.error("Selecione a empresa para alteração"); return;
    }
    if (novoProcessoData.tipo !== 'alteracao' && !novoProcessoData.nome_empresa) {
      toast.error("Preencha o nome da empresa"); return;
    }
    if (novoProcessoData.tipo === 'alteracao' && novoProcessoData.eventos.length === 0) {
      toast.error("Selecione ao menos um evento de alteração"); return;
    }

    let finalNome = novoProcessoData.nome_empresa;
    if (novoProcessoData.tipo === 'alteracao' && novoProcessoData.empresa_id) {
      const emp = empresas.find(e => e.id === novoProcessoData.empresa_id);
      finalNome = emp?.nome_empresa || '';
    }

    const { data, error } = await supabase.from("processos_societarios" as any).insert([{
      ...novoProcessoData,
      empresa_id: novoProcessoData.empresa_id || null,
      nome_empresa: finalNome,
      current_step: 'envio_dbe_at'
    }]).select().single();

    if (error) {
      toast.error("Erro ao criar: " + error.message);
    } else {
      await addHistorico(data.id, 'PROCESSO_INICIADO', `Tipo: ${tipoProcessoLabels[novoProcessoData.tipo]}`);
      toast.success("Processo iniciado!");
      setShowNovoProcesso(false);
      setNovoProcessoData({ 
        tipo: 'abertura', 
        nome_empresa: '', 
        empresa_id: null, 
        numero_processo: '', 
        data_inicio: new Date().toISOString().split('T')[0],
        eventos: []
      });
      queryClient.invalidateQueries({ queryKey: ["processos_societarios"] });
    }
  };

  const openDeleteConfirm = (id: string, nome: string) => {
    setProcessoToDelete({ id, nome });
  };

  const executeDeleteProcesso = async () => {
    if (!processoToDelete) return;
    const { id } = processoToDelete;
    setProcessoToDelete(null); // Fecha o modal imediatamente para não bloquear UI

    const { error } = await supabase.from("processos_societarios" as any).delete().eq("id", id);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Processo excluído!"); queryClient.invalidateQueries({ queryKey: ["processos_societarios"] }); }
  };

  const updatePasso = async (id: string, campo: string, value: any) => {
    // Determine the action for history
    let acao = 'ETAPA_ATUALIZADA';
    let detalhes = `${campo}: ${value}`;

    if (campo === 'dbe_deferido') {
      acao = value ? 'DBE_DEFERIDO' : 'DBE_INDEFERIDO';
      detalhes = value ? 'DBE marcado como deferido' : 'DBE marcado como indeferido - Processo reiniciado';
    } else if (campo === 'assinatura_deferida') {
      acao = value ? 'ASSINATURA_DEFERIDA' : 'ASSINATURA_INDEFERIDA';
      detalhes = value ? 'Assinatura validada' : 'Assinatura rejeitada';
    }

    const updateObj: any = { [campo]: value };
    
    // Logic for "Reiniciar" or "Voltar"
    if (campo === 'dbe_deferido' && value === false) {
      updateObj.envio_dbe_at = null;
      updateObj.current_step = 'envio_dbe_at';
    }

    const { error } = await supabase.from("processos_societarios" as any).update(updateObj).eq("id", id);
    if (error) toast.error("Erro: " + error.message);
    else {
      await addHistorico(id, acao, detalhes);
      queryClient.invalidateQueries({ queryKey: ["processos_societarios"] });
    }
  };

  const updateDetalhePasso = async (id: string, stepId: string, field: string, value: string) => {
    const processo = processos.find(p => p.id === id);
    if (!processo) return;
    const novosDetalhes = { ...processo.detalhes_passos };
    novosDetalhes[stepId] = { ...novosDetalhes[stepId], [field]: value };
    const { error } = await supabase.from("processos_societarios" as any).update({ detalhes_passos: novosDetalhes }).eq("id", id);
    if (error) toast.error("Erro ao salvar detalhes: " + error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["processos_societarios"] });
    }
  };

  const filteredEmpresas = empresas.filter((e) => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const matchSituacao = filterSituacao === "todas" || e.situacao === filterSituacao;
    const matchRegime = filterRegime === "todos" || e.regime_tributario === filterRegime;
    let matchTab = false;
    if (activeTab === "ativas") matchTab = !e.situacao || e.situacao === "ativa";
    else if (activeTab === "paralisadas") matchTab = e.situacao === "paralisada";
    else if (activeTab === "baixadas") matchTab = e.situacao === "baixada";
    else if (activeTab === "mei") matchTab = e.porte_empresa === "mei" && (!e.situacao || e.situacao === "ativa");
    return matchSearch && matchSituacao && matchRegime && matchTab;
  });

  const stats = {
    ativas: empresas.filter(e => !e.situacao || e.situacao === "ativa").length,
    paralisadas: empresas.filter(e => e.situacao === "paralisada").length,
    baixadas: empresas.filter(e => e.situacao === "baixada").length,
    mei: empresas.filter(e => e.porte_empresa === "mei" && (!e.situacao || e.situacao === "ativa")).length,
    processosAtivos: processos.filter(p => p.status === 'em_andamento').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Tabs */}
      <div className="flex border-b border-border">
        <button onClick={() => setActiveMainTab("empresas")} className={`pb-3 px-6 text-sm font-bold transition-all border-b-2 ${activeMainTab === "empresas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <div className="flex items-center gap-2 underline-offset-8">
            <Building2 size={18} /> EMPRESAS
          </div>
        </button>
        <button onClick={() => setActiveMainTab("processos")} className={`pb-3 px-6 text-sm font-bold transition-all border-b-2 ${activeMainTab === "processos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <div className="flex items-center gap-2">
            <Activity size={18} /> PROCESSOS
            {stats.processosAtivos > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{stats.processosAtivos}</span>}
          </div>
        </button>
      </div>

      {loadingInitial ? (
        <div className="space-y-8">
          <PageHeaderSkeleton />
          <TableSkeleton rows={8} />
        </div>
      ) : (
        <>
          {activeMainTab === "empresas" && (
            <div className="space-y-6 animate-in slide-in-from-left-2 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="header-title">Societário</h1>
                  <p className="text-muted-foreground mt-1">Gestão de empresas e processos de constituição/alteração.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2.5 rounded-xl border transition-all ${isFavorite ? "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-sm shadow-amber-500/10" : "bg-card border-border text-muted-foreground hover:bg-muted hover:border-border/80"}`}
                    title={isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                  >
                    <Star size={20} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                    <button
                      onClick={async () => {
                        const confirmed = window.confirm("Isso irá criar e confirmar o acesso de todas as empresas cadastradas que ainda não possuem login. Deseja continuar?");
                        if (!confirmed) return;

                        const id = toast.loading("Sincronizando acessos...", { duration: 0 });
                        try {
                          const result = await syncCompanyClients((curr, total) => {
                            toast.loading(`Sincronizando: ${curr}/${total}...`, { id });
                          });
                          toast.success(`Sincronização concluída! ${result?.synced} acessos criados/corrigidos.`, { id });
                        } catch (err: any) {
                          toast.error("Erro na sincronização: " + err.message, { id });
                        }
                      }}
                      className="button-secondary-premium"
                      title="Sincronizar todos os acessos do portal"
                    >
                      <RefreshCw size={18} />
                      Sincronizar Acessos
                    </button>
                    <button onClick={() => navigate("/societario/nova")} className="button-premium">
                      <Plus size={18} /> Nova Empresa
                    </button>
                  </div>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Ativas", value: stats.ativas, cls: "text-success", bg: "bg-success/10", icon: Building2 },
                  { label: "MEI", value: stats.mei, cls: "text-info", bg: "bg-info/10", icon: Activity },
                  { label: "Paralisadas", value: stats.paralisadas, cls: "text-warning", bg: "bg-warning/10", icon: AlertCircle },
                  { label: "Baixadas", value: stats.baixadas, cls: "text-destructive", bg: "bg-destructive/10", icon: X }
                ].map((s) => (
                  <div key={s.label} className="card-premium group">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2.5 rounded-2xl ${s.bg} ${s.cls} group-hover:scale-110 transition-transform shadow-sm`}>
                        {s.icon ? <s.icon size={20} /> : <Building2 size={20} />}
                      </div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{s.label}</span>
                    </div>
                    <p className="text-4xl font-black text-card-foreground group-hover:text-primary transition-colors duration-500">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="card-premium !p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative flex-1 w-full flex items-center">
                    <Search size={18} className="absolute left-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nome ou CNPJ..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)} 
                      className="w-full pl-12 pr-4 py-3 border border-border/50 rounded-2xl bg-muted/30 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all" 
                    />
                  </div>
                  <button 
                    onClick={() => setShowFilters(!showFilters)} 
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border transition-all ${showFilters ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  >
                    <Filter size={18} /> Filtros <ChevronDown size={14} className={`transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-border/50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Regime Tributário</label>
                      <select value={filterRegime} onChange={(e) => setFilterRegime(e.target.value)} className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                        <option value="todos">Todos os Regimes</option>
                        <option value="simples">Simples Nacional</option>
                        <option value="lucro_presumido">Lucro Presumido</option>
                        <option value="lucro_real">Lucro Real</option>
                        <option value="mei">MEI</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Situação Cadastral</label>
                      <select value={filterSituacao} onChange={(e) => setFilterSituacao(e.target.value)} className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                        <option value="todas">Todas as Situações</option>
                        <option value="ativa">Ativa</option>
                        <option value="paralisada">Paralisada</option>
                        <option value="baixada">Baixada</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <button
                        onClick={() => { setSearch(""); setFilterSituacao("todas"); setFilterRegime("todos"); }}
                        className="text-xs text-primary font-black hover:underline uppercase tracking-widest px-4 py-2 decoration-2 underline-offset-4"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex border-b border-border overflow-x-auto no-scrollbar pt-2">
                {["ativas", "mei", "paralisadas", "baixadas"].map(t => (
                  <button key={t} onClick={() => setActiveTab(t as any)} className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === 'ativas' ? 'Empresas Ativas' : t === 'mei' ? 'Empresas MEI' : t === 'paralisadas' ? 'Paralisadas' : 'Baixadas'}</button>
                ))}
              </div>

              <div className="card-premium !p-0 overflow-hidden border-t-0 rounded-t-none">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="rounded-tl-none">Empresa</th>
                        <th>CNPJ</th>
                        <th>Regime</th>
                        <th className="text-center">Situação</th>
                        <th className="text-center">Sócios</th>
                        <th className="text-right pr-8">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredEmpresas.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-24 text-muted-foreground bg-muted/5">
                            <div className="flex flex-col items-center gap-4">
                              <div className="p-6 rounded-full bg-muted/10">
                                <Building2 size={48} className="opacity-20" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-xl text-card-foreground">Nenhuma empresa encontrada</p>
                                <p className="text-sm">Tente ajustar seus filtros de busca para encontrar o que procura.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : filteredEmpresas.map((emp) => {
                        const sit = situacaoConfig[emp.situacao || "ativa"] || situacaoConfig.ativa;
                        return (
                          <tr key={emp.id} className="cursor-pointer group transition-all" onClick={() => navigate(`/societario/${emp.id}`)}>
                            <td className="py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
                                  <Building2 size={22} />
                                </div>
                                <div>
                                  <p className="font-black text-card-foreground group-hover:text-primary transition-colors text-base">{emp.nome_empresa}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">ID: {emp.id.split('-')[0]}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-muted-foreground font-mono text-xs">{emp.cnpj || "—"}</td>
                            <td>
                              <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/50">
                                {regimeLabels[emp.regime_tributario || ""] || "—"}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`badge-status ${sit.cls} shadow-sm shadow-current/5 font-black text-[10px] px-3 py-1`}>{sit.label}</span>
                            </td>
                            <td className="text-center">
                              <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-muted/50 text-xs font-black text-card-foreground border border-border/50">
                                {emp.socios_count || 0}
                              </span>
                            </td>
                            <td className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => navigate(`/societario/${emp.id}`)} className="p-3 rounded-2xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20" title="Ver Detalhes">
                                  <Eye size={20} />
                                </button>
                                <button onClick={() => navigate(`/societario/${emp.id}`)} className="p-3 rounded-2xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20" title="Editar">
                                  <Edit2 size={20} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeMainTab === "processos" && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-black text-card-foreground flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <History size={24} />
                    </div>
                    Processos Societários
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 ml-11">Acompanhamento de constituição, alteração e baixas.</p>
                </div>
                <button onClick={() => setShowNovoProcesso(true)} className="button-premium">
                  <Plus size={20} /> Novo Processo
                </button>
              </div>

              {showNovoProcesso && (
                <div className="card-premium bg-primary/[0.02] border-primary/20 animate-in zoom-in-95 duration-300 ring-4 ring-primary/5">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-primary/10">
                    <h4 className="font-black text-primary flex items-center gap-2">
                      <Plus size={20} /> INICIAR NOVO PROCESSO
                    </h4>
                    <button onClick={() => setShowNovoProcesso(false)} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">TIPO DE PROCESSO</label>
                        <select 
                          value={novoProcessoData.tipo} 
                          onChange={e => setNovoProcessoData({ ...novoProcessoData, tipo: e.target.value, empresa_id: null, nome_empresa: '', eventos: [] })} 
                          className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
                        >
                          {Object.entries(tipoProcessoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      
                      {novoProcessoData.tipo === 'alteracao' ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SELECIONAR EMPRESA</label>
                          <select 
                            value={novoProcessoData.empresa_id || ''} 
                            onChange={e => setNovoProcessoData({ ...novoProcessoData, empresa_id: e.target.value })} 
                            className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Selecione uma empresa...</option>
                            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">NOME DA EMPRESA</label>
                          <input 
                            value={novoProcessoData.nome_empresa} 
                            onChange={e => setNovoProcessoData({ ...novoProcessoData, nome_empresa: e.target.value })} 
                            placeholder="Ex: Audipreve Contabilidade LTDA" 
                            className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" 
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nº PROCESSO (Protocolo)</label>
                        <input 
                          value={novoProcessoData.numero_processo} 
                          onChange={e => setNovoProcessoData({ ...novoProcessoData, numero_processo: e.target.value })} 
                          placeholder="Digite se houver..." 
                          className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" 
                        />
                      </div>
                    </div>

                    {novoProcessoData.tipo === 'alteracao' && (
                      <div className="bg-muted/30 p-6 rounded-2xl border border-border/50">
                        <label className="text-[10px] font-black text-muted-foreground block mb-6 uppercase tracking-[0.2em] ml-1">TIPOS DE ALTERAÇÃO (Selecione um ou mais)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {eventosAlteracao.map(evento => (
                            <label key={evento} className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-background transition-all border border-transparent hover:border-border/50">
                              <input 
                                type="checkbox" 
                                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                checked={novoProcessoData.eventos.includes(evento)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setNovoProcessoData({ ...novoProcessoData, eventos: [...novoProcessoData.eventos, evento] });
                                  } else {
                                    setNovoProcessoData({ ...novoProcessoData, eventos: novoProcessoData.eventos.filter(ev => ev !== evento) });
                                  }
                                }}
                              />
                              <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{evento}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={handleCreateProcesso} 
                        className="button-premium !px-12 py-4"
                      >
                        Iniciar Processo Agora
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {processos.length === 0 ? (
                  <div className="card-premium text-center py-24 text-muted-foreground">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 rounded-full bg-muted/10">
                        <Activity size={48} className="opacity-20" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-xl text-card-foreground">Nenhum processo em andamento</p>
                        <p className="text-sm">Inicie um novo processo para acompanhar o status aqui.</p>
                      </div>
                    </div>
                  </div>
                ) : processos.map(p => {
                  const isExpanded = expandedProcesso === p.id;

                  return (
                    <div key={p.id} className={`card-premium !p-0 border-l-8 transition-all duration-500 overflow-hidden ${isExpanded ? "border-l-primary shadow-2xl ring-1 ring-primary/20 scale-[1.01]" : "border-l-muted hover:border-l-primary/40 hover:shadow-md"}`}>
                      {/* Accordion Header (Summary) */}
                      <div
                        className={`p-6 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer transition-colors ${isExpanded ? "bg-primary/[0.02]" : "hover:bg-muted/30"}`}
                        onClick={() => setExpandedProcesso(isExpanded ? null : p.id)}
                      >
                        <div className="flex items-center gap-5 flex-1 w-full">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isExpanded ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-primary/10 text-primary"}`}>
                            <Building2 size={28} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-black text-card-foreground text-xl group-hover:text-primary transition-colors">{p.nome_empresa || "Sem Nome"}</h4>
                              {p.status === 'concluido' && <span className="badge-status badge-success text-[10px] font-black px-3 py-1">CONCLUÍDO</span>}
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                              <span className="text-xs font-black text-primary uppercase tracking-[0.15em]">{tipoProcessoLabels[p.tipo] || p.tipo}</span>
                              {p.numero_processo && <span className="text-xs text-muted-foreground font-mono font-bold opacity-60"># {p.numero_processo}</span>}
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold"><Clock size={14} className="text-primary/60" /> {new Date(p.data_inicio).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-border/50">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDeleteConfirm(p.id, p.nome_empresa || "Sem Nome"); }}
                            className="p-3 rounded-2xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all border border-transparent hover:border-destructive/20"
                            title="Excluir Processo"
                          >
                            <Trash2 size={20} />
                          </button>
                          <div className={`p-2.5 rounded-2xl transition-all duration-500 ${isExpanded ? "bg-primary text-primary-foreground rotate-180" : "bg-muted text-primary"}`}>
                            <ChevronDown size={28} />
                          </div>
                        </div>
                      </div>

                      {/* Accordion Body (Details - Vertical Timeline) */}
                      {isExpanded && (
                        <div className="p-8 border-t border-border/50 animate-in slide-in-from-top-4 duration-500 space-y-10 bg-gradient-to-b from-primary/[0.01] to-transparent">
                          {/* Tabs for Timeline / History */}
                          <div className="flex gap-8 border-b border-border/50 mb-8">
                            <button 
                              onClick={() => setProcessTab({ ...processTab, [p.id]: 'timeline' })}
                              className={`pb-4 px-2 text-[10px] font-black tracking-widest transition-all border-b-4 ${(!processTab[p.id] || processTab[p.id] === 'timeline') ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            >
                              LINHA DO TEMPO
                            </button>
                            <button 
                              onClick={() => setProcessTab({ ...processTab, [p.id]: 'historico' })}
                              className={`pb-4 px-2 text-[10px] font-black tracking-widest transition-all border-b-4 ${processTab[p.id] === 'historico' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            >
                              HISTÓRICO DO PROCESSO
                            </button>
                          </div>

                          {(!processTab[p.id] || processTab[p.id] === 'timeline') ? (
                            <div className="space-y-8">
                              {p.tipo === 'alteracao' && p.eventos && p.eventos.length > 0 && (
                                <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-border mb-6">
                                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1"><Filter size={10} /> Eventos de Alteração</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {p.eventos.map(ev => <span key={ev} className="px-2 py-1 bg-background border border-border rounded text-[10px] font-medium">{ev}</span>)}
                                  </div>
                                </div>
                              )}

                              <div className="space-y-6">
                                {passosConfig.map((step, idx) => {
                                  const isDone = !!(p as any)[step.id];
                                  const prevStepId = idx > 0 ? passosConfig[idx - 1].id : null;
                                  const isPrevDone = prevStepId ? !!(p as any)[prevStepId] : true;
                                  
                                  // Special logic for Alteracao/Abertura steps
                                  const isDBE = step.id === 'envio_dbe_at';
                                  const isSignature = step.id === 'assinatura_contrato_at';
                                  const hasApprovalGate = p.tipo === 'alteracao' || p.tipo === 'abertura' || p.tipo === 'abertura_mei';
                                  
                                  const isBlockedByExigencia = step.id === 'arquivamento_junta_at' && (p.tipo === 'abertura' || p.tipo === 'abertura_mei') && !p.foi_deferido && !p.exigencia_respondida;
                                  
                                  // DBE Deferido Logic
                                  const canComplete = !isDone && isPrevDone && !isBlockedByExigencia;

                                  const detalhes = (p.detalhes_passos && p.detalhes_passos[step.id]) || {};

                                  return (
                                    <div key={step.id} className="relative pl-10">
                                      {/* Line Connector */}
                                      {idx < passosConfig.length - 1 && (
                                        <div className={`absolute left-4 top-8 bottom-0 w-0.5 -ml-px ${isDone ? "bg-primary" : "bg-muted"}`} />
                                      )}

                                      {/* Icon Circle */}
                                      <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? "bg-primary border-primary text-primary-foreground" : isPrevDone ? "border-primary/50 text-primary" : "border-muted text-muted-foreground"}`}>
                                        {isDone ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                        {/* Title & Status */}
                                        <div className="md:col-span-4">
                                          <h5 className={`font-bold transition-colors ${isDone ? "text-primary" : "text-card-foreground"}`}>{step.label}</h5>
                                          <div className="flex flex-col gap-2 mt-1">
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => {
                                                  if (isDone) return;
                                                  if (!isPrevDone) { toast.error("Conclua a etapa anterior"); return; }
                                                  if (isBlockedByExigencia) { toast.error("Aguardando Deferimento ou Resposta de Exigência"); return; }
                                                  
                                                  if (hasApprovalGate && isDBE && p.dbe_deferido === undefined) {
                                                    toast.error("Marque se o DBE foi deferido ou não"); return;
                                                  }
                                                  
                                                  updatePasso(p.id, step.id, new Date().toISOString());
                                                }}
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase transition-all ${isDone ? "bg-green-500 text-white" : canComplete ? "bg-primary text-white hover:scale-105 cursor-pointer" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                                              >
                                                {isDone ? "Concluído" : "Marcar Concluído"}
                                              </button>
                                              {isDone && <span className="text-[10px] font-mono text-muted-foreground">{new Date((p as any)[step.id]).toLocaleString()}</span>}
                                            </div>

                                            {/* Approval Step Specifics: DBE Approval */}
                                            {hasApprovalGate && isDBE && !isDone && isPrevDone && (
                                              <div className="flex gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                                                <button 
                                                  onClick={() => updatePasso(p.id, 'dbe_deferido', true)}
                                                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${p.dbe_deferido === true ? "bg-green-500 text-white" : "bg-background text-muted-foreground"}`}
                                                >
                                                  DEFERIDO
                                                </button>
                                                <button 
                                                  onClick={() => {
                                                    if (window.confirm("Reiniciar todo o processo?")) {
                                                      updatePasso(p.id, 'dbe_deferido', false);
                                                    }
                                                  }}
                                                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${p.dbe_deferido === false ? "bg-destructive text-white" : "bg-background text-muted-foreground"}`}
                                                >
                                                  NÃO DEFERIDO
                                                </button>
                                              </div>
                                            )}

                                            {/* Approval Step Specifics: Signature Approval */}
                                            {hasApprovalGate && isSignature && isDone && (
                                              <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Resultado Assinatura</span>
                                                  <div className="flex gap-2">
                                                    <button 
                                                      onClick={() => updatePasso(p.id, 'assinatura_deferida', true)}
                                                      className={`px-2 py-1 rounded text-[9px] font-bold ${p.assinatura_deferida === true ? "bg-green-500 text-white" : "bg-background text-muted-foreground"}`}
                                                    >
                                                      DEFERIDA
                                                    </button>
                                                    <button 
                                                      onClick={() => updatePasso(p.id, 'assinatura_deferida', false)}
                                                      className={`px-2 py-1 rounded text-[9px] font-bold ${p.assinatura_deferida === false ? "bg-destructive text-white" : "bg-background text-muted-foreground"}`}
                                                    >
                                                      NÃO DEFERIDA
                                                    </button>
                                                  </div>
                                                </div>

                                                {p.assinatura_deferida === false && (
                                                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                                    <ControlledTextarea 
                                                      value={p.indeferimento_motivo || ''} 
                                                      onBlur={val => updatePasso(p.id, 'indeferimento_motivo', val)}
                                                      placeholder="Motivo do indeferimento..."
                                                      className="w-full text-xs p-2 border border-destructive/20 rounded bg-background outline-none focus:ring-1 focus:ring-destructive"
                                                      rows={2}
                                                    />
                                                    <div className="flex flex-wrap gap-1">
                                                      <span className="text-[9px] font-bold text-muted-foreground w-full mb-1">VOLTAR PARA:</span>
                                                      <button 
                                                        onClick={() => {
                                                          const up: any = { 
                                                            envio_contrato_at: null, 
                                                            envio_taxa_at: null, 
                                                            assinatura_contrato_at: null,
                                                            assinatura_deferida: null,
                                                            current_step: 'envio_contrato_at'
                                                          };
                                                          supabase.from("processos_societarios" as any).update(up).eq("id", p.id).then(() => {
                                                            addHistorico(p.id, 'RETORNO_ETAPA', 'Voltado para Envio do Contrato');
                                                            queryClient.invalidateQueries({ queryKey: ["processos_societarios"] });
                                                          });
                                                        }}
                                                        className="px-2 py-1 bg-background border border-border rounded text-[9px] font-bold hover:bg-muted"
                                                      >
                                                        CONTRATO
                                                      </button>
                                                      <button 
                                                        onClick={() => {
                                                          const up: any = { 
                                                            envio_fcn_at: null, 
                                                            envio_contrato_at: null, 
                                                            envio_taxa_at: null, 
                                                            assinatura_contrato_at: null,
                                                            assinatura_deferida: null,
                                                            current_step: 'envio_fcn_at'
                                                          };
                                                          supabase.from("processos_societarios" as any).update(up).eq("id", p.id).then(() => {
                                                            addHistorico(p.id, 'RETORNO_ETAPA', 'Voltado para Envio da FCN');
                                                            queryClient.invalidateQueries({ queryKey: ["processos_societarios"] });
                                                          });
                                                        }}
                                                        className="px-2 py-1 bg-background border border-border rounded text-[9px] font-bold hover:bg-muted"
                                                      >
                                                        FCN
                                                      </button>
                                                      <button 
                                                        onClick={() => {
                                                          if (window.confirm("Reiniciar todo o processo?")) {
                                                            const up: any = { 
                                                              envio_dbe_at: null,
                                                              envio_fcn_at: null, 
                                                              envio_contrato_at: null, 
                                                              envio_taxa_at: null, 
                                                              assinatura_contrato_at: null,
                                                              assinatura_deferida: null,
                                                              dbe_deferido: null,
                                                              current_step: 'envio_dbe_at'
                                                            };
                                                            supabase.from("processos_societarios" as any).update(up).eq("id", p.id).then(() => {
                                                              addHistorico(p.id, 'REINICIADO', 'Processo reiniciado completamente');
                                                              queryClient.invalidateQueries({ queryKey: ["processos_societarios"] });
                                                            });
                                                          }
                                                        }}
                                                        className="px-2 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded text-[9px] font-bold hover:bg-destructive hover:text-white"
                                                      >
                                                        REINICIAR TUDO
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Form Details */}
                                        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                                              <User size={10} /> Enviado por
                                            </label>
                                            <ControlledInput
                                              value={detalhes.enviado_por || ''}
                                              onBlur={val => updateDetalhePasso(p.id, step.id, 'enviado_por', val)}
                                              placeholder="Quem enviou?"
                                              className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary outline-none"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                                              <MessageSquare size={10} /> Observações
                                            </label>
                                            <ControlledTextarea
                                              value={detalhes.observacoes || ''}
                                              onBlur={val => updateDetalhePasso(p.id, step.id, 'observacoes', val)}
                                              placeholder="Ocorrências..."
                                              rows={1}
                                              className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6 animate-in fade-in duration-300 px-2 pb-6">
                              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                  <History size={14} className="text-primary" /> Cronologia Completa do Processo
                                </h5>
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                  {p.historico?.length || 0} Registros
                                </span>
                              </div>
                              
                              <div className="space-y-4">
                                {(!p.historico || p.historico.length === 0) ? (
                                  <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border text-muted-foreground">
                                    <Clock size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm font-medium">Nenhum histórico registrado ainda</p>
                                    <p className="text-[10px] opacity-70">As ações realizadas aparecerão aqui</p>
                                  </div>
                                ) : (
                                  [...p.historico].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((h, hIdx) => (
                                    <div key={h.id} className="relative pl-8 pb-6 last:pb-0">
                                      {hIdx < p.historico!.length - 1 && (
                                        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-muted/50" />
                                      )}
                                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-lg bg-background border border-border shadow-sm flex items-center justify-center z-10 transition-transform hover:scale-110">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                      </div>
                                      <div className="bg-card/50 p-3 rounded-xl border border-border/50 hover:border-primary/30 transition-all hover:bg-card">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs font-bold text-primary tracking-tight">
                                            {h.acao.replace(/_/g, ' ')}
                                          </span>
                                          <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            {new Date(h.created_at).toLocaleString()}
                                          </span>
                                        </div>
                                        {h.detalhes && (
                                          <p className="text-xs text-muted-foreground leading-relaxed">
                                            {h.detalhes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* Finalize Button */}
                          {p.arquivamento_junta_at && p.status !== 'concluido' && (
                            <div className="flex justify-center pt-4">
                              <button
                                onClick={() => {
                                  if (p.tipo === 'alteracao' && p.empresa_id) {
                                    navigate(`/societario/${p.empresa_id}`, { state: { nome: p.nome_empresa, processoId: p.id } });
                                  } else {
                                    navigate("/societario/nova", { state: { nome: p.nome_empresa, processoId: p.id } });
                                  }
                                }}
                                className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-green-500 text-white font-bold text-base shadow-xl hover:shadow-green-500/30 transition-all hover:-translate-y-1 active:scale-95"
                              >
                                <CheckCircle size={22} className="group-hover:scale-110 transition-transform" /> 
                                {p.tipo === 'alteracao' ? "FINALIZAR PROCESSO E ATUALIZAR EMPRESA" : "FINALIZAR PROCESSO E CADASTRAR EMPRESA"}
                                <ArrowRight size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal de Confirmação de Exclusão */}
          {processoToDelete && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                    <Trash2 size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-card-foreground">Excluir Processo</h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Tem certeza que deseja excluir o processo da empresa <strong className="text-foreground">{processoToDelete.nome}</strong>? Esta ação não pode ser desfeita.
                  </p>
                </div>
                <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
                  <button
                    onClick={() => setProcessoToDelete(null)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeDeleteProcesso}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all shadow-sm active:scale-95"
                  >
                    Sim, Excluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SocietarioPage;
