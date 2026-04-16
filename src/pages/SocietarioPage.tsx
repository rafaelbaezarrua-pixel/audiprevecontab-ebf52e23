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
    <div className="space-y-8 animate-fade-in pb-20 relative px-1">
      {/* Background decoration elements (Reduced as per user request to have less effects) */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <h1 className="header-title">Gestão <span className="text-primary/90">Societária</span></h1>
             <FavoriteToggleButton moduleId="societario" />
          </div>
          <p className="subtitle-premium">Carteira de clientes, aberturas, alterações e baixas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <button
             onClick={async () => {
               const confirmed = window.confirm("Sincronizar todos os acessos do portal?");
               if (!confirmed) return;
               const id = toast.loading("Sincronizando...");
               try {
                 await syncCompanyClients(() => {});
                 toast.success("Sincronizado!", { id });
               } catch (e: any) { toast.error(e.message, { id }); }
             }}
             className="flex items-center gap-2.5 px-6 h-12 bg-black/5 dark:bg-white/5 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-border/10"
           >
             <RefreshCw size={18} className={isFetchingPage ? "animate-spin" : ""} />
             <span>Sincronizar</span>
           </button>
           
           <button 
             onClick={() => navigate("/societario/nova")} 
             className="button-premium px-8 h-12 text-[10px] tracking-widest"
           >
             <Plus size={18} />
             <span>Nova Empresa</span>
           </button>
        </div>
      </div>

      {/* Main Feature Tabs (Empresas vs Processos) */}
      <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-xl border border-border/10 w-full max-w-sm ml-1">
        <button 
          onClick={() => setActiveMainTab("empresas")} 
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeMainTab === "empresas" ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground hover:bg-card/30"}`}
        >
          <Building2 size={16} /> 
          <span>Portfolio</span>
        </button>
        <button 
          onClick={() => setActiveMainTab("processos")} 
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative ${activeMainTab === "processos" ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground hover:bg-card/30"}`}
        >
          <Activity size={16} /> 
          <span>Processos</span>
          {stats.processosAtivos > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white shadow-sm">{stats.processosAtivos}</span>
          )}
        </button>
      </div>

      {activeMainTab === "empresas" ? (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
          {/* Stats Bar */}
          <SocietarioStats stats={stats} />

          {/* Filters Area */}
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="relative flex-1 w-full md:max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="BUSCAR POR NOME, CNPJ OU CLIENTE..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="w-full pl-12 pr-4 h-14 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl outline-none text-[11px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/20" 
                />
              </div>

              <div className="flex items-center gap-3">
                 <button 
                  onClick={() => setShowFilters(!showFilters)} 
                  className={`flex items-center gap-2.5 px-6 h-14 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${showFilters ? "border-primary/50 bg-primary/10 text-primary" : "bg-black/5 dark:bg-white/5 border-border/10 text-muted-foreground/60 hover:text-foreground"}`}
                >
                  <Filter size={18} /> 
                  <span>Filtros Especiais</span>
                  <ChevronDown size={14} className={`transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="glass-card p-8 border-border/10 animate-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">Regime Tributário</label>
                    <select 
                      value={filterRegime} 
                      onChange={(e) => setFilterRegime(e.target.value)} 
                      className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/10 outline-none transition-all cursor-pointer"
                    >
                      <option value="todos">TODOS OS REGIMES</option>
                      <option value="simples">SIMPLES NACIONAL</option>
                      <option value="lucro_presumido">LUCRO PRESUMIDO</option>
                      <option value="lucro_real">LUCRO REAL</option>
                      <option value="mei">MEI / SIMEI</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">Situação Cadastral</label>
                    <select 
                      value={filterSituacao} 
                      onChange={(e) => setFilterSituacao(e.target.value)} 
                      className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/10 outline-none transition-all cursor-pointer"
                    >
                      <option value="todas">TODAS AS SITUAÇÕES</option>
                      <option value="ativa">ATIVA / OPERANTE</option>
                      <option value="paralisada">PARALISADA / INOPERANTE</option>
                      <option value="baixada">BAIXADA / EXTINTA</option>
                      <option value="entregue">ENTREGUES (ENCERRADAS)</option>
                    </select>
                  </div>

                  <div className="flex items-end lg:col-span-2">
                    <button 
                      onClick={() => { setSearch(""); setFilterSituacao("todas"); setFilterRegime("todos"); }} 
                      className="h-12 px-6 text-[10px] font-black uppercase tracking-[0.15em] text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tabs for Portfolio Filtering */}
            <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-xl border border-border/10 overflow-x-auto no-scrollbar gap-1 w-full mt-2">
              {[
                { id: "ativas", label: "Empresas Ativas" }, 
                { id: "mei", label: "MEI / SIMEI" }, 
                { id: "paralisadas", label: "Paralisadas" }, 
                { id: "baixadas", label: "Baixadas" }, 
                { id: "entregue", label: "Entregues" }
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id as any)} 
                  className={`px-8 py-3 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap ${activeTab === t.id ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground hover:bg-card/30"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
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
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-2">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-foreground flex items-center gap-3 uppercase tracking-tight">
                <History className="text-primary" size={22} /> Fluxo de Processos
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-9">Acompanhamento em tempo real das etapas societárias.</p>
            </div>
            <button 
              onClick={() => setShowNovoProcesso(true)} 
              className="button-premium px-8 py-4 text-[11px] tracking-widest"
            >
              <Plus size={20} /> INICIAR NOVO PROCESSO
            </button>
          </div>

          {showNovoProcesso && (
            <div className="animate-in slide-in-from-top-4 duration-300">
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
            <div className="glass-card flex flex-col items-center justify-center py-32 border-dashed border-border/20 opacity-60">
              <Activity size={48} className="text-muted-foreground/20 mb-4" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">Nenhum processo em andamento no momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-modal w-full max-w-sm p-10 text-center space-y-8 animate-zoom-in">
            <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto">
               <Activity size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Excluir Processo?</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Você está prestes a excluir o processo de <br/><span className="text-foreground">{processoToDelete.nome}</span>.</p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={() => { deleteProcesso.mutate(processoToDelete.id); setProcessoToDelete(null); }} className="h-14 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-rose-600">Confirmar Exclusão</button>
              <button onClick={() => setProcessoToDelete(null)} className="h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocietarioPage;
