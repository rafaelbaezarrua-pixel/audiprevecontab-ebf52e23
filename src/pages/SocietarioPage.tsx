import { RealtimeChannel } from "@supabase/supabase-js";
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Building2, Search, Filter, ChevronDown,
  Plus, History, Activity, Star, RefreshCw
} from "lucide-react";

import { toast } from "sonner";
import { useSocietario } from "@/hooks/useSocietario";
import { EmpresaTable } from "@/components/societario/EmpresaTable";
import { SocietarioStats } from "@/components/societario/SocietarioStats";
import { NovoProcessoForm } from "@/components/societario/NovoProcessoForm";
import { ProcessoCard } from "@/components/societario/ProcessoCard";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { syncCompanyClients } from "@/lib/sync-clients";
import { tipoProcessoLabels, passosConfig } from "@/constants/societario";
import { Empresa, Processo } from "@/types/societario";
import { List } from "lucide-react";

const SocietarioPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    empresas, processos, isLoading, isFetching,
    deleteProcesso, updateProcesso, getPaginatedEmpresas
  } = useSocietario();

  const [searchParams] = useSearchParams();
  const [activeMainTab, setActiveMainTab] = useState<"empresas" | "processos">((searchParams.get("view") as any) || "empresas");
  const [activeTab, setActiveTab] = useState<"ativas" | "paralisadas" | "baixadas" | "mei" | "entregue">((searchParams.get("aba") as any) || "ativas");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterSituacao, setFilterSituacao] = useState(searchParams.get("situacao") || "todas");
  const [filterRegime, setFilterRegime] = useState(searchParams.get("regime") || "todos");
  const [showFilters, setShowFilters] = useState(!!searchParams.get("regime") || !!searchParams.get("situacao"));
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [expandedProcesso, setExpandedProcesso] = useState<string | null>(null);
  const [processTab, setProcessTab] = useState<Record<string, 'timeline' | 'historico'>>({});
  const [processoToDelete, setProcessoToDelete] = useState<{ id: string, nome: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [novoProcessoData, setNovoProcessoData] = useState({
    tipo: 'abertura',
    nome_empresa: '',
    empresa_id: null as string | null,
    numero_processo: '',
    data_inicio: new Date().toISOString().split('T')[0],
    eventos: [] as string[]
  });

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });


  useEffect(() => {
    // Sync URL params to state if they change externally (e.g. clicking dashboard chart)
    const view = searchParams.get("view");
    if (view === "empresas" || view === "processos") setActiveMainTab(view);

    const regime = searchParams.get("regime");
    if (regime) {
      setFilterRegime(regime);
      setShowFilters(true);
    }

    const situacao = searchParams.get("situacao");
    if (situacao) {
      setFilterSituacao(situacao);
      setShowFilters(true);
    }

    const aba = searchParams.get("aba");
    if (aba) setActiveTab(aba as any);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // Reset to page 0 if filters change
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, filterSituacao, filterRegime, activeTab]);

  const { data: paginatedResult, isLoading: loadingPaginated, isFetching: isFetchingPage } = useQuery({
    queryKey: ["societario_empresas_paginated", pagination.pageIndex, pagination.pageSize, debouncedSearch, activeTab, filterSituacao, filterRegime, refreshTrigger],
    queryFn: () => getPaginatedEmpresas(
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearch,
      filterSituacao !== 'todas' ? filterSituacao : activeTab,
      filterRegime
    ),
    placeholderData: (prev) => prev,
    staleTime: 30000,
  });

  const paginatedData = paginatedResult || { data: [], count: 0 };

  React.useEffect(() => {
    let isMounted = true;
    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'empresas' },
          (payload) => {
            if (isMounted) {
              // Force a refetch of the current page
              setRefreshTrigger(prev => prev + 1);
            }
          }
        )
        .subscribe();
    }

    setupRealtime();

    return () => {
      isMounted = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);


  const handleCreateProcesso = async () => {
    // Basic validation
    if (novoProcessoData.tipo === 'alteracao' && !novoProcessoData.empresa_id) {
      toast.error("Selecione a empresa para alteração"); return;
    }
    if (novoProcessoData.tipo !== 'alteracao' && !novoProcessoData.nome_empresa) {
      toast.error("Preencha o nome da empresa"); return;
    }

    let finalNome = novoProcessoData.nome_empresa;
    if (novoProcessoData.tipo === 'alteracao' && novoProcessoData.empresa_id) {
      finalNome = empresas.find(e => e.id === novoProcessoData.empresa_id)?.nome_empresa || '';
    }

    const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await (await import("@/integrations/supabase/client")).supabase.from("processos_societarios" as any).insert([{
      ...novoProcessoData,
      empresa_id: novoProcessoData.empresa_id || null,
      nome_empresa: finalNome,
      current_step: 'envio_dbe_at'
    }]).select().single();

    if (error) {
      toast.error("Erro ao criar: " + error.message);
    } else {
      const inserted = (data as any) as { id: string };
      await (await import("@/integrations/supabase/client")).supabase.from("processos_societarios_historico" as any).insert({
        processo_id: inserted.id,
        usuario_id: user.id,
        acao: 'PROCESSO_INICIADO',
        detalhes: `Tipo: ${tipoProcessoLabels[novoProcessoData.tipo]}`
      });
      toast.success("Processo iniciado!");
      setShowNovoProcesso(false);
      queryClient.invalidateQueries({ queryKey: ["processos_societarios"] });
    }
  };

  const stats = {
    ativas: empresas.filter(e => e.situacao === "ativa").length,
    paralisadas: empresas.filter(e => e.situacao === "paralisada").length,
    baixadas: empresas.filter(e => e.situacao === "baixada").length,
    entregues: empresas.filter(e => e.situacao === "entregue").length,
    mei: empresas.filter(e => e.regime_tributario === "mei" && ["ativa", "paralisada"].includes(e.situacao || "")).length,
    processosAtivos: processos.filter(p => p.status === 'em_andamento').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <TableSkeleton rows={8} />
      </div>
    );
  }
  return (
    <div className="animate-fade-in relative pb-10">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      <div className="space-y-6">
        {/* Main Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div className="space-y-1 -mt-2">
            <div className="flex items-center gap-2">
              <h1 className="header-title">Gestão <span className="text-primary/90 font-black">Societário</span></h1>
              <FavoriteToggleButton moduleId="societario" />
            </div>
            <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm leading-tight">empresas e acompanhamento de processos.</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={async () => {
                const confirmed = window.confirm("Sincronizar?");
                if (!confirmed) return;
                const id = toast.loading("Sincronizando...");
                try {
                  await syncCompanyClients(() => { });
                  toast.success("Sincronizado!", { id });
                } catch (e: any) { toast.error(e.message, { id }); }
              }}
              className="flex items-center gap-2 px-4 h-9 bg-black/10 dark:bg-white/5 text-muted-foreground/50 hover:text-primary rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border border-border/10 shadow-inner"
            >
              <RefreshCw size={14} className={isFetchingPage ? "animate-spin" : ""} />
              <span>Sincronizar</span>
            </button>

            <button
              onClick={() => navigate("/societario/nova")}
              className="h-9 bg-primary text-primary-foreground px-6 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus size={16} />
              <span>Nova Empresa</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-white/[0.02] p-1.5 rounded-2xl border border-border/10 shadow-sm backdrop-blur-sm">
          {/* Main Feature Tabs */}
          <div className="flex bg-black/5 dark:bg-white/10 p-1 rounded-xl w-full md:max-w-[240px] h-10">
            <button
              onClick={() => setActiveMainTab("empresas")}
              className={`flex-1 flex items-center justify-center gap-2 h-full rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeMainTab === "empresas" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}
            >
              <Building2 size={12} /> Empresas
            </button>
            <button
              onClick={() => setActiveMainTab("processos")}
              className={`flex-1 flex items-center justify-center gap-2 h-full rounded-md text-[8px] font-black uppercase tracking-widest transition-all relative ${activeMainTab === "processos" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}
            >
              <Activity size={12} /> Processos
              {stats.processosAtivos > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[7px] font-black text-primary-foreground shadow-sm ring-2 ring-background">{stats.processosAtivos}</span>
              )}
            </button>
          </div>

          {activeMainTab === "empresas" && (
            <div className="flex bg-black/5 dark:bg-white/10 p-1 rounded-xl overflow-x-auto no-scrollbar gap-1 max-w-full h-10">
              {[
                { id: "ativas", label: "Ativas" },
                { id: "mei", label: "MEI" },
                { id: "paralisadas", label: "Paral." },
                { id: "baixadas", label: "Baix." },
                { id: "entregue", label: "Entr." }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-4 h-full rounded-md text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeMainTab === "empresas" ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-left-1 duration-200">
            {/* Stats Bar */}
            <SocietarioStats stats={stats} />

            {/* Filters Area */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full md:max-w-[360px] group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-all" size={14} />
                  <input
                    type="text"
                    placeholder="PROCURAR EMPRESA OU CNPJ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 h-10 bg-card border border-border/20 rounded-xl outline-none text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 transition-all placeholder:opacity-20 shadow-sm"
                  />
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-5 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all shadow-inner ${showFilters ? "border-primary/50 bg-primary/10 text-primary" : "bg-black/10 dark:bg-white/5 border-border/10 text-muted-foreground/40 hover:text-foreground"}`}
                >
                  <Filter size={14} /> FILTROS AVANÇADOS
                  <ChevronDown size={12} className={`transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
                </button>
              </div>

              {showFilters && (
                <div className="bg-card border border-border/10 rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[7px] font-black text-muted-foreground/50 uppercase tracking-widest pl-1">Regime Tributário</label>
                      <select
                        value={filterRegime}
                        onChange={(e) => setFilterRegime(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer shadow-inner"
                      >
                        <option value="todos">TODOS OS REGIMES</option>
                        <option value="simples">SIMPLES NACIONAL</option>
                        <option value="lucro_presumido">LUCRO PRESUMIDO</option>
                        <option value="lucro_real">LUCRO REAL</option>
                        <option value="mei">MEI / SIMEI</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[7px] font-black text-muted-foreground/50 uppercase tracking-widest pl-1">Situação Cadastral</label>
                      <select
                        value={filterSituacao}
                        onChange={(e) => setFilterSituacao(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer shadow-inner"
                      >
                        <option value="todas">TODAS AS SITUAÇÕES</option>
                        <option value="ativa">ATIVA / OPERANTE</option>
                        <option value="paralisada">PARALISADA</option>
                        <option value="baixada">BAIXADA</option>
                        <option value="entregue">ENTREGUES</option>
                      </select>
                    </div>

                    <div className="flex items-end lg:col-span-2">
                      <button
                        onClick={() => { setSearch(""); setFilterSituacao("todas"); setFilterRegime("todos"); }}
                        className="h-9 px-4 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-all"
                      >
                        Limpar Configuração
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="animate-fade-in">
              <EmpresaTable
                empresas={paginatedData.data}
                totalCount={paginatedData.count}
                pagination={pagination}
                setPagination={setPagination}
                isLoading={loadingPaginated}
                onInlineEdit={async (id, field, value) => {
                  try {
                    const { error } = await (await import("@/integrations/supabase/client")).supabase.from("empresas").update({ [field]: value }).eq("id", id);
                    if (error) throw error;
                    toast.success("Empresa atualizada!");
                    setPagination(prev => ({ ...prev }));
                  } catch (e: any) {
                    toast.error("Erro ao atualizar: " + e.message);
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-1 duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
              <div className="space-y-0.5">
                <h3 className="text-[14px] font-black text-foreground flex items-center gap-2.5 uppercase tracking-tighter">
                  <History className="text-primary" size={18} /> Fluxo de Processos Societários
                </h3>
                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest pl-7">Acompanhamento técnico das etapas operacionais.</p>
              </div>
              <button
                onClick={() => setShowNovoProcesso(true)}
                className="h-10 bg-primary text-primary-foreground px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center gap-2"
              >
                <Plus size={18} /> INICIAR PROCESSO
              </button>
            </div>

            {showNovoProcesso && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <NovoProcessoForm
                  empresas={empresas}
                  novoProcessoData={novoProcessoData}
                  setNovoProcessoData={setNovoProcessoData}
                  onSubmit={handleCreateProcesso}
                  onCancel={() => setShowNovoProcesso(false)}
                />
              </div>
            )}

            {processos.length === 0 ? (
              <div className="module-card flex flex-col items-center justify-center py-20 border-dashed border-border/10 opacity-40">
                <Activity size={32} className="text-muted-foreground/20 mb-3" />
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nenhum processo em andamento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {processos.map(p => (
                  <ProcessoCard
                    key={p.id}
                    processo={p}
                    isExpanded={expandedProcesso === p.id}
                    onToggleExpand={() => setExpandedProcesso(expandedProcesso === p.id ? null : p.id)}
                    onDelete={(id, nome) => setProcessoToDelete({ id, nome })}
                    activeTab={processTab[p.id] || 'timeline'}
                    onTabChange={(tab) => setProcessTab({ ...processTab, [p.id]: tab })}
                    onUpdatePasso={(id, campo, value) => {
                      let acao: string | undefined = undefined;
                      let detalhes: string | undefined = undefined;

                      if (value && typeof value === 'string' && value.includes('T') && !value.includes(' ')) {
                        const stepLabel = passosConfig.find(p => p.id === campo)?.label || campo;
                        acao = 'ETAPA_CONCLUIDA';
                        detalhes = `Etapa "${stepLabel}" marcada como concluída.`;
                      } else if (campo === 'dbe_deferido') {
                        acao = value ? 'DBE_DEFERIDO' : 'DBE_INDEFERIDO';
                      } else if (campo === 'assinatura_deferida') {
                        acao = value ? 'ASSINATURA_DEFERIDA' : 'ASSINATURA_INDEFERIDA';
                      } else if (campo === 'foi_deferido') {
                        acao = value ? 'PROCESSO_DEFERIDO_JUNTA' : 'PROCESSO_INDEFERIDO_JUNTA';
                      } else if (campo === 'em_exigencia') {
                        acao = value ? 'PROCESSO_EM_EXIGENCIA' : 'EXIGENCIA_REMOVIDA';
                      } else if (campo === 'exigencia_respondida') {
                        acao = value ? 'EXIGENCIA_RESPONDIDA' : 'EXIGENCIA_REABERTA';
                        if (value) detalhes = "A exigência da Junta Comercial foi respondida pelo usuário.";
                      }

                      updateProcesso.mutate({ id, updates: { [campo]: value }, acao, detalhes });
                    }}
                    onUpdateDetalhePasso={(id, stepId, field, value) => {
                      const novosDetalhes = { ...p.detalhes_passos };
                      novosDetalhes[stepId] = { ...novosDetalhes[stepId], [field]: value };
                      updateProcesso.mutate({ id, updates: { detalhes_passos: novosDetalhes } });
                    }}
                    onFinalize={(proc) => {
                      if (proc.tipo === 'alteracao' && proc.empresa_id) {
                        navigate(`/societario/${proc.empresa_id}`, { state: { nome: proc.nome_empresa, processoId: proc.id } });
                      } else {
                        navigate("/societario/nova", { state: { nome: proc.nome_empresa, processoId: proc.id } });
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {processoToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in text-center shadow-2xl">
            <div className="bg-card border border-border/10 w-full max-w-sm p-8 text-center space-y-6 animate-in zoom-in-95 duration-200 rounded-2xl">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Activity size={32} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-[14px] font-black text-foreground uppercase tracking-tight">Excluir Processo Operacional?</h2>
                <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest leading-relaxed">Você está prestes a remover o fluxo de:<br /><span className="text-rose-500">{processoToDelete.nome}</span>.</p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button onClick={() => { deleteProcesso.mutate(processoToDelete.id); setProcessoToDelete(null); }} className="h-11 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-rose-600 shadow-lg shadow-rose-500/20 active:scale-95">Confirmar Exclusão</button>
                <button onClick={() => setProcessoToDelete(null)} className="h-10 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground transition-all">Manter Registro</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocietarioPage;
