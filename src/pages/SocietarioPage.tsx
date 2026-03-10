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

interface Processo {
  id: string; tipo: string; nome_empresa: string | null; empresa_id: string | null;
  numero_processo: string | null; data_inicio: string; status: string;
  envio_dbe_at: string | null; envio_fcn_at: string | null; envio_contrato_at: string | null;
  envio_taxa_at: string | null; assinatura_contrato_at: string | null;
  arquivamento_junta_at: string | null; foi_deferido: boolean; foi_arquivado: boolean;
  em_exigencia: boolean; exigencia_motivo: string | null; exigencia_respondida: boolean;
  detalhes_passos: Record<string, DetalhesPasso>;
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

const passosConfig = [
  { id: 'envio_dbe_at', label: 'Envio do DBE' },
  { id: 'envio_fcn_at', label: 'Envio da FCN' },
  { id: 'envio_contrato_at', label: 'Envio do Contrato' },
  { id: 'envio_taxa_at', label: 'Envio da Taxa' },
  { id: 'assinatura_contrato_at', label: 'Assinatura' },
  { id: 'arquivamento_junta_at', label: 'Arquivamento' },
];

const SocietarioPage: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<"empresas" | "processos">("empresas");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSituacao, setFilterSituacao] = useState("todas");
  const [filterRegime, setFilterRegime] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"ativas" | "paralisadas" | "baixadas" | "mei">("ativas");
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [novoProcessoData, setNovoProcessoData] = useState({ tipo: 'abertura', nome_empresa: '', numero_processo: '', data_inicio: new Date().toISOString().split('T')[0] });
  const [expandedProcesso, setExpandedProcesso] = useState<string | null>(null);
  const [processoToDelete, setProcessoToDelete] = useState<{ id: string, nome: string } | null>(null);

  const navigate = useNavigate();

  const fetchEmpresas = async () => {
    const { data } = await supabase.from("empresas").select("*").order("nome_empresa");
    const { data: sociosData } = await supabase.from("socios").select("empresa_id");
    const sociosCounts: Record<string, number> = {};
    sociosData?.forEach(s => { sociosCounts[s.empresa_id] = (sociosCounts[s.empresa_id] || 0) + 1; });
    setEmpresas((data || []).map(e => ({ ...e, socios_count: sociosCounts[e.id] || 0 })));
  };

  const fetchProcessos = async () => {
    const { data } = await supabase.from("processos_societarios" as any).select("*").order("created_at", { ascending: false });
    setProcessos((data as unknown as Processo[]) || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoadingInitial(true);
      await Promise.all([fetchEmpresas(), fetchProcessos()]);
      setLoadingInitial(false);
    };
    init();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase.channel("societario_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "empresas" }, () => fetchEmpresas())
      .on("postgres_changes", { event: "*", schema: "public", table: "processos_societarios" as any }, () => fetchProcessos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreateProcesso = async () => {
    if (!novoProcessoData.nome_empresa) { toast.error("Preencha o nome da empresa"); return; }
    const { error } = await supabase.from("processos_societarios" as any).insert([novoProcessoData]);
    if (error) toast.error("Erro ao criar: " + error.message);
    else { toast.success("Processo iniciado!"); setShowNovoProcesso(false); fetchProcessos(); }
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
    else { toast.success("Processo excluído!"); fetchProcessos(); }
  };

  const updatePasso = async (id: string, campo: string, value: any) => {
    const { error } = await supabase.from("processos_societarios" as any).update({ [campo]: value }).eq("id", id);
    if (error) toast.error("Erro: " + error.message);
    else fetchProcessos();
  };

  const updateDetalhePasso = async (id: string, stepId: string, field: string, value: string) => {
    const processo = processos.find(p => p.id === id);
    if (!processo) return;
    const novosDetalhes = { ...processo.detalhes_passos };
    novosDetalhes[stepId] = { ...novosDetalhes[stepId], [field]: value };
    const { error } = await supabase.from("processos_societarios" as any).update({ detalhes_passos: novosDetalhes }).eq("id", id);
    if (error) toast.error("Erro ao salvar detalhes: " + error.message);
    else fetchProcessos();
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
            <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-card-foreground">Societário</h1>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2.5 rounded-xl border transition-all ${isFavorite ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
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
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-all border border-border"
                    title="Sincronizar todos os acessos do portal"
                  >
                    <RefreshCw size={18} />
                    Sincronizar Acessos
                  </button>
                  <button onClick={() => navigate("/societario/nova")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground shadow-md hover:shadow-lg transition-all" style={{ background: "var(--gradient-primary)" }}>
                    <Plus size={18} /> Nova Empresa
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[{ label: "Ativas", value: stats.ativas, cls: "badge-success" }, { label: "MEI", value: stats.mei, cls: "bg-info/10 text-info border-info/20" }, { label: "Paralisadas", value: stats.paralisadas, cls: "badge-warning" }, { label: "Baixadas", value: stats.baixadas, cls: "badge-danger" }].map((s) => (
                  <div key={s.label} className="stat-card flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{s.label}</p><p className="text-2xl font-bold text-card-foreground mt-1">{s.value}</p></div>
                    <span className={`badge-status ${s.cls} text-lg px-4 py-1.5`}>{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="module-card">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative flex-1 w-full"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                  <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${showFilters ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}><Filter size={16} /> Filtros <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} /></button>
                </div>
                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-tight">Regime</label>
                      <select value={filterRegime} onChange={(e) => setFilterRegime(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                        <option value="todos">Todos</option>
                        <option value="simples">Simples Nacional</option>
                        <option value="lucro_presumido">Lucro Presumido</option>
                        <option value="lucro_real">Lucro Real</option>
                        <option value="mei">MEI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-tight">Situação (Geral)</label>
                      <select value={filterSituacao} onChange={(e) => setFilterSituacao(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                        <option value="todas">Todas</option>
                        <option value="ativa">Ativa</option>
                        <option value="paralisada">Paralisada</option>
                        <option value="baixada">Baixada</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => { setSearch(""); setFilterSituacao("todas"); setFilterRegime("todos"); }}
                        className="text-xs text-primary font-bold hover:underline py-2"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex border-b border-border overflow-x-auto no-scrollbar pt-2">
                {["ativas", "mei", "paralisadas", "baixadas"].map(t => (
                  <button key={t} onClick={() => setActiveTab(t as any)} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === 'ativas' ? 'Empresas Ativas' : t === 'mei' ? 'Empresas MEI' : t === 'paralisadas' ? 'Paralisadas' : 'Baixadas'}</button>
                ))}
              </div>

              <div className="module-card overflow-x-auto p-0 border-t-0 rounded-t-none">
                <table className="data-table">
                  <thead><tr><th>Empresa</th><th>CNPJ</th><th>Regime</th><th>Situação</th><th>Sócios</th><th className="text-right">Ações</th></tr></thead>
                  <tbody>
                    {filteredEmpresas.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><p className="font-medium">Nenhuma empresa encontrada</p></td></tr>
                    ) : filteredEmpresas.map((emp) => {
                      const sit = situacaoConfig[emp.situacao || "ativa"] || situacaoConfig.ativa;
                      return (
                        <tr key={emp.id} className="cursor-pointer group" onClick={() => navigate(`/societario/${emp.id}`)}>
                          <td><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110"><Building2 size={16} className="text-primary" /></div><span className="font-semibold text-card-foreground">{emp.nome_empresa}</span></div></td>
                          <td className="text-muted-foreground font-mono text-xs">{emp.cnpj || "—"}</td>
                          <td className="text-muted-foreground">{regimeLabels[emp.regime_tributario || ""] || "—"}</td>
                          <td><span className={`badge-status ${sit.cls}`}>{sit.label}</span></td>
                          <td className="text-muted-foreground">{emp.socios_count || 0}</td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => navigate(`/societario/${emp.id}`)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"><Eye size={15} /></button>
                              <button onClick={() => navigate(`/societario/${emp.id}`)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"><Edit2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMainTab === "processos" && (
            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2"><History size={20} className="text-primary" /> Processos Societários</h3>
                <button onClick={() => setShowNovoProcesso(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground shadow-md transition-all" style={{ background: "var(--gradient-primary)" }}>
                  <Plus size={18} /> Novo Processo
                </button>
              </div>

              {showNovoProcesso && (
                <div className="module-card bg-muted/20 border-primary/30 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-4"><h4 className="font-bold text-primary flex items-center gap-2"><Plus size={16} /> Iniciar Novo Processo</h4><button onClick={() => setShowNovoProcesso(false)} className="p-1 hover:bg-muted rounded-md"><X size={18} /></button></div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-tight">TIPO DE PROCESSO</label><select value={novoProcessoData.tipo} onChange={e => setNovoProcessoData({ ...novoProcessoData, tipo: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary">{Object.entries(tipoProcessoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                    <div className="md:col-span-1"><label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-tight">NOME DA EMPRESA</label><input value={novoProcessoData.nome_empresa} onChange={e => setNovoProcessoData({ ...novoProcessoData, nome_empresa: e.target.value })} placeholder="Ex: Nova LTDA" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm outline-none" /></div>
                    <div><label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-tight">Nº PROCESSO</label><input value={novoProcessoData.numero_processo} onChange={e => setNovoProcessoData({ ...novoProcessoData, numero_processo: e.target.value })} placeholder="Número se houver" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm outline-none" /></div>
                    <button onClick={handleCreateProcesso} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90">Iniciar</button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {processos.length === 0 ? (
                  <div className="module-card text-center py-12 text-muted-foreground"><Activity size={40} className="mx-auto mb-3 opacity-20" /><p>Nenhum processo iniciado</p></div>
                ) : processos.map(p => {
                  const isExpanded = expandedProcesso === p.id;

                  return (
                    <div key={p.id} className={`module-card border-l-4 transition-all overflow-hidden ${isExpanded ? "border-l-primary shadow-lg ring-1 ring-primary/20" : "border-l-muted hover:border-l-primary/50"}`}>
                      {/* Accordion Header (Summary) */}
                      <div
                        className="flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer"
                        onClick={() => setExpandedProcesso(isExpanded ? null : p.id)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                            <Building2 size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-card-foreground text-lg">{p.nome_empresa || "Sem Nome"}</h4>
                              {p.status === 'concluido' && <span className="badge-status badge-success text-[10px]">Concluído</span>}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                              <span className="text-xs font-bold text-primary uppercase tracking-tighter">{tipoProcessoLabels[p.tipo] || p.tipo}</span>
                              {p.numero_processo && <span className="text-xs text-muted-foreground font-mono"># {p.numero_processo}</span>}
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> {new Date(p.data_inicio).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDeleteConfirm(p.id, p.nome_empresa || "Sem Nome"); }}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                          <div className="p-2 rounded-full hover:bg-muted text-primary transition-transform">
                            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Body (Details - Vertical Timeline) */}
                      {isExpanded && (
                        <div className="mt-8 pt-6 border-t border-border animate-in slide-in-from-top-2 duration-300 space-y-8">
                          <div className="space-y-6">
                            {passosConfig.map((step, idx) => {
                              const isDone = !!(p as any)[step.id];
                              const prevStepId = idx > 0 ? passosConfig[idx - 1].id : null;
                              const isPrevDone = prevStepId ? !!(p as any)[prevStepId] : true;
                              const isBlockedByExigencia = step.id === 'arquivamento_junta_at' && !p.foi_deferido && !p.exigencia_respondida;
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
                                      <div className="flex items-center gap-2 mt-1">
                                        <button
                                          onClick={() => {
                                            if (isDone) return;
                                            if (!isPrevDone) { toast.error("Conclua a etapa anterior"); return; }
                                            if (isBlockedByExigencia) { toast.error("Aguardando Deferimento ou Resposta de Exigência"); return; }
                                            updatePasso(p.id, step.id, new Date().toISOString());
                                          }}
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase transition-all ${isDone ? "bg-green-500 text-white" : canComplete ? "bg-primary text-white hover:scale-105 cursor-pointer" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                                        >
                                          {isDone ? "Concluído" : "Marcar Concluído"}
                                        </button>
                                        {isDone && <span className="text-[10px] font-mono text-muted-foreground">{new Date((p as any)[step.id]).toLocaleString()}</span>}
                                      </div>
                                    </div>

                                    {/* Form Details */}
                                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                                          <User size={10} /> Enviado por
                                        </label>
                                        <input
                                          type="text"
                                          value={detalhes.enviado_por || ''}
                                          onChange={e => updateDetalhePasso(p.id, step.id, 'enviado_por', e.target.value)}
                                          placeholder="Quem enviou?"
                                          className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary outline-none"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                                          <MessageSquare size={10} /> Observações
                                        </label>
                                        <textarea
                                          value={detalhes.observacoes || ''}
                                          onChange={e => updateDetalhePasso(p.id, step.id, 'observacoes', e.target.value)}
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

                          {/* Assinatura Gate Controls */}
                          {p.assinatura_contrato_at && !p.arquivamento_junta_at && (
                            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-primary uppercase tracking-widest">Controle Pós-Assinatura</h5>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => updatePasso(p.id, 'foi_deferido', !p.foi_deferido)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${p.foi_deferido ? "bg-green-500 text-white shadow-md shadow-green-500/20" : "bg-card border border-border text-muted-foreground hover:bg-green-50"}`}
                                  >
                                    {p.foi_deferido ? <CheckCircle size={14} /> : <div className="w-3 h-3 rounded-full border-2 border-current" />} DEFERIDO
                                  </button>
                                  <button
                                    onClick={() => updatePasso(p.id, 'em_exigencia', !p.em_exigencia)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${p.em_exigencia ? "bg-warning text-white shadow-md shadow-warning/20" : "bg-card border border-border text-muted-foreground hover:bg-warning/5"}`}
                                  >
                                    <AlertCircle size={14} /> EM EXIGÊNCIA
                                  </button>
                                </div>
                              </div>

                              {p.em_exigencia && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-tighter">Motivo da Exigência</label>
                                    <textarea
                                      value={p.exigencia_motivo || ''}
                                      onChange={e => updatePasso(p.id, 'exigencia_motivo', e.target.value)}
                                      placeholder="Descreva detalhadamente..."
                                      className="w-full px-4 py-2 border border-warning/30 rounded-xl bg-background text-sm focus:ring-1 focus:ring-warning outline-none shadow-inner"
                                    />
                                  </div>
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => { updatePasso(p.id, 'exigencia_respondida', true); updatePasso(p.id, 'em_exigencia', false); }}
                                      className="px-6 py-2 bg-warning text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all"
                                    >
                                      EXIGÊNCIA RESPONDIDA
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Finalize Button */}
                          {p.arquivamento_junta_at && p.status !== 'concluido' && (
                            <div className="flex justify-center pt-4">
                              <button
                                onClick={() => navigate("/societario/nova", { state: { nome: p.nome_empresa, processoId: p.id } })}
                                className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-green-500 text-white font-bold text-base shadow-xl hover:shadow-green-500/30 transition-all hover:-translate-y-1 active:scale-95"
                              >
                                <CheckCircle size={22} className="group-hover:scale-110 transition-transform" /> FINALIZAR PROCESSO E CADASTRAR EMPRESA
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
