import { RealtimeChannel } from "@supabase/supabase-js";
import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
    empresas, processos, isLoading, 
    deleteProcesso, updateProcesso, getPaginatedEmpresas
  } = useSocietario();

  const [searchParams] = useSearchParams();
  const [activeMainTab, setActiveMainTab] = useState<"empresas" | "processos">((searchParams.get("view") as any) || "empresas");
  const [activeTab, setActiveTab] = useState<"ativas" | "paralisadas" | "baixadas" | "mei" | "entregue">((searchParams.get("aba") as any) || "ativas");
  const [search, setSearch] = useState("");
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

  const [paginatedData, setPaginatedData] = useState<{ data: Empresa[]; count: number }>({ data: [], count: 0 });
  const [isFetchingPage, setIsFetchingPage] = useState(false);

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

  React.useEffect(() => {
    // Reset to page 0 if filters change
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [search, filterSituacao, filterRegime, activeTab]);

  React.useEffect(() => {
    const fetchPage = async () => {
      setIsFetchingPage(true);
      try {
        const result = await getPaginatedEmpresas(
           pagination.pageIndex, 
           pagination.pageSize, 
           search, 
           // activeTab acts as situacao filter if nothing else is selected in the regular filter dropdown
           filterSituacao !== 'todas' ? filterSituacao : activeTab, 
           filterRegime
        );
        setPaginatedData(result);
      } catch (err) {
        toast.error("Erro ao carregar empresas");
      } finally {
        setIsFetchingPage(false);
      }
    };
    
    // Debounce search
    const timeout = setTimeout(() => {
        fetchPage();
    }, 300);

    return () => clearTimeout(timeout);
  }, [pagination.pageIndex, pagination.pageSize, search, filterSituacao, filterRegime, activeTab, refreshTrigger]);

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

      {activeMainTab === "empresas" ? (
        <div className="space-y-6 animate-in slide-in-from-left-2 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="header-title">Societário</h1>
              <p className="text-muted-foreground mt-1">Gestão de empresas e processos de constituição/alteração.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FavoriteToggleButton moduleId="societario" />
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
                className="button-secondary-premium"
              >
                <RefreshCw size={18} /> Sincronizar Acessos
              </button>
              <button onClick={() => navigate("/societario/nova")} className="button-premium">
                <Plus size={18} /> Nova Empresa
              </button>
            </div>
          </div>

          <SocietarioStats stats={stats} />

          <div className="card-premium !p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 w-full flex items-center">
                <Search size={18} className="absolute left-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou CNPJ..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 border border-border/50 rounded-2xl bg-muted/30 text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border ${showFilters ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                <Filter size={18} /> Filtros <ChevronDown size={14} className={showFilters ? "rotate-180" : ""} />
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-border/50 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Regime</label>
                  <select value={filterRegime} onChange={(e) => setFilterRegime(e.target.value)} className="w-full px-4 py-2 border rounded-xl bg-background text-sm">
                    <option value="todos">Todos</option>
                    <option value="simples">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                    <option value="mei">MEI</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Situação</label>
                  <select value={filterSituacao} onChange={(e) => setFilterSituacao(e.target.value)} className="w-full px-4 py-2 border rounded-xl bg-background text-sm">
                    <option value="todas">Todas</option>
                    <option value="ativa">Ativa</option>
                    <option value="paralisada">Paralisada</option>
                    <option value="baixada">Baixada</option>
                    <option value="entregue">Entregue</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => { setSearch(""); setFilterSituacao("todas"); setFilterRegime("todos"); }} className="text-xs text-primary font-black uppercase tracking-widest px-4 py-2">Limpar</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex border-b border-border overflow-x-auto no-scrollbar pt-2">
            {["ativas", "mei", "paralisadas", "baixadas", "entregue"].map(t => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t === "entregue" ? "ENTREGUES" : t.toUpperCase()}</button>
            ))}
          </div>

          <EmpresaTable 
            empresas={paginatedData.data} 
            totalCount={paginatedData.count} 
            pagination={pagination} 
            setPagination={setPagination}
            isLoading={isFetchingPage}
            onInlineEdit={async (id, field, value) => {
              try {
                const { error } = await (await import("@/integrations/supabase/client")).supabase.from("empresas").update({ [field]: value }).eq("id", id);
                if (error) throw error;
                toast.success("Empresa atualizada!");
                // Force fetch page again to get updated item
                setPagination(prev => ({ ...prev }));
              } catch (e: any) {
                toast.error("Erro ao atualizar: " + e.message);
              }
            }}
          />
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-card-foreground flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary"><History size={24} /></div>
                Processos Societários
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowNovoProcesso(true)} className="button-premium">
                <Plus size={20} /> Novo Processo
              </button>
            </div>
          </div>

          {showNovoProcesso && (
            <NovoProcessoForm 
              empresas={empresas}
              novoProcessoData={novoProcessoData}
              setNovoProcessoData={setNovoProcessoData}
              onSubmit={handleCreateProcesso}
              onCancel={() => setShowNovoProcesso(false)}
            />
          )}

          {processos.length === 0 ? (
            <div className="card-premium text-center py-24 text-muted-foreground">Nenhum processo em andamento</div>
          ) : (
            <div className="space-y-6">
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
                      // É uma data ISO marcando conclusão
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border p-6">
            <h2 className="text-xl font-bold">Excluir Processo?</h2>
            <p className="text-muted-foreground mt-2 text-sm">Ação irreversível para <strong>{processoToDelete.nome}</strong>.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setProcessoToDelete(null)} className="px-4 py-2 text-sm font-bold">Cancelar</button>
              <button onClick={() => { deleteProcesso.mutate(processoToDelete.id); setProcessoToDelete(null); }} className="px-4 py-2 bg-destructive text-white rounded-xl text-sm font-bold">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocietarioPage;
