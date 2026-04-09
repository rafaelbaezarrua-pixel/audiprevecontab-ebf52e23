
import React, { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useHonorarios } from "@/hooks/useHonorarios";
import { useSocietario } from "@/hooks/useSocietario";
import { useAuth } from "@/contexts/AuthContext";
import { HonorariosGeralView } from "@/components/honorarios/HonorariosGeralView";
import { HonorariosEmpresasView } from "@/components/honorarios/HonorariosEmpresasView";
import { HonorarioConfig, HonorarioMensal, ServicoEsporadico } from "@/types/honorarios";
import { Empresa } from "@/types/societario";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

const HonorariosPage: React.FC = () => {
  const { user } = useAuth();
  const { getPaginatedEmpresas } = useSocietario();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mainTab, setMainTab] = useState<"empresas" | "geral">("empresas");
  const [globalCompetencia, setGlobalCompetencia] = useState(new Date().toISOString().slice(0, 7));

  const {
    listGeral, listEsporadicos, revenueTrend, loading: loadingHonorarios, isFetching: isFetchingHonorarios,
    saveConfig, saveMensal, saveEsporadico, deleteEsporadico
  } = useHonorarios(globalCompetencia);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, "mensal" | "configuracao" | "pastas">>({});
  const [activeStatusTab, setActiveStatusTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 12 });
  const [configs, setConfigs] = useState<Record<string, Partial<HonorarioConfig>>>({});
  const [mensalData, setMensalData] = useState<Record<string, HonorarioMensal[]>>({});
  const [configForms, setConfigForms] = useState<Record<string, Partial<HonorarioConfig>>>({});
  const [mensalForms, setMensalForms] = useState<Record<string, Partial<HonorarioMensal>>>({});
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<Record<string, string>>({});
  const [todasEmpresas, setTodasEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (mainTab === 'geral' && todasEmpresas.length === 0) {
      const fetchAll = async () => {
        const { data } = await supabase.from("empresas").select("*").order("nome_empresa");
        setTodasEmpresas((data as Empresa[]) || []);
      };
      fetchAll();
    }
  }, [mainTab, todasEmpresas.length]);

  const { data: paginatedResult, isLoading: loadingPaginated } = useQuery({
    queryKey: ["honorarios_empresas_paginated", pagination.pageIndex, pagination.pageSize, debouncedSearch, activeStatusTab, user?.id],
    queryFn: () => getPaginatedEmpresas(
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearch,
      activeStatusTab,
      "todos",
      "honorarios",
      user?.id
    ),
    placeholderData: (prev) => prev,
    staleTime: 30000,
  });

  const paginatedData = paginatedResult?.data || [];
  const totalCount = paginatedResult?.count || 0;

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, activeStatusTab]);

  const toggleExpand = async (empresaId: string) => {
    if (expanded === empresaId) {
      setExpanded(null);
      return;
    }
    setExpanded(empresaId);
    if (!activeTabs[empresaId]) setActiveTabs(prev => ({ ...prev, [empresaId]: "mensal" }));
    if (!competenciaSelecionada[empresaId]) setCompetenciaSelecionada(prev => ({ ...prev, [empresaId]: new Date().toISOString().slice(0, 7) }));

    // Load local data for the company
    const { data: config } = await supabase.from("honorarios_config").select("*").eq("empresa_id", empresaId).maybeSingle();
    const finalConfig: Partial<HonorarioConfig> = (config as unknown as Partial<HonorarioConfig>) || { empresa_id: empresaId, valor_honorario: 0, valor_por_funcionario: 0, valor_por_recalculo: 0, valor_trabalhista: 0, outros_servicos: [] };
    setConfigs(prev => ({ ...prev, [empresaId]: finalConfig }));
    setConfigForms(prev => ({ ...prev, [empresaId]: { ...finalConfig } }));

    const { data: mensal } = await supabase.from("honorarios_mensal").select("*").eq("empresa_id", empresaId).order('competencia', { ascending: false });
    setMensalData(prev => ({ ...prev, [empresaId]: (mensal as unknown as HonorarioMensal[]) || [] }));
  };

  const parseCurrency = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val);
    if (str.includes(',')) return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
    return parseFloat(str) || 0;
  };

  const calculateTotal = (config: Partial<HonorarioConfig>, qtdFunc: number, qtdRecalculos: number, teveTrabalhista: boolean, qtdRecibos: number) => {
    const honorario = Number(config?.valor_honorario || 0);
    const funcVlr = Number(config?.valor_por_funcionario || 0) * qtdFunc;
    const recVlr = Number(config?.valor_por_recalculo || 0) * qtdRecalculos;
    const trabVlr = teveTrabalhista ? Number(config?.valor_trabalhista || 0) : 0;
    const reciboVlr = Number(config?.valor_por_recibo || 0) * qtdRecibos;
    const outrosVlr = (config?.outros_servicos || []).reduce((sum: number, item: any) => sum + Number(item.valor || 0), 0);

    const detalhes = [
      { rotulo: "Honorário Base", qtd: 1, vlrUnit: honorario, vlrTotal: honorario },
      ...(qtdFunc > 0 ? [{ rotulo: "Funcionários/Pró-labore", qtd: qtdFunc, vlrUnit: Number(config?.valor_por_funcionario || 0), vlrTotal: funcVlr }] : []),
      ...(qtdRecalculos > 0 ? [{ rotulo: "Recálculos", qtd: qtdRecalculos, vlrUnit: Number(config?.valor_por_recalculo || 0), vlrTotal: recVlr }] : []),
      ...(teveTrabalhista ? [{ rotulo: "Encargos Trabalhistas", qtd: 1, vlrUnit: Number(config?.valor_trabalhista || 0), vlrTotal: trabVlr }] : []),
      ...(qtdRecibos > 0 ? [{ rotulo: "Recibos (Pessoal)", qtd: qtdRecibos, vlrUnit: Number(config?.valor_por_recibo || 0), vlrTotal: reciboVlr }] : []),
      ...(config?.outros_servicos || []).map((s: any) => ({ rotulo: s.descricao || "Serviço Adicional", qtd: 1, vlrUnit: Number(s.valor || 0), vlrTotal: Number(s.valor || 0) }))
    ];

    return { total: honorario + funcVlr + recVlr + trabVlr + reciboVlr + outrosVlr, detalhes };
  };

  const handleGenerateMonth = async (empresaId: string, compOverride?: string) => {
    const comp = compOverride || competenciaSelecionada[empresaId];
    if (!comp) return;
    try {
      const config = configs[empresaId];
      if (!config || typeof config.valor_honorario === 'undefined') {
        toast.error("Configure os valores base primeiro na aba Configuração");
        return;
      }
      const { data: pessoalData } = await supabase.from("pessoal").select("*").eq("empresa_id", empresaId).eq("competencia", comp).maybeSingle();
      const qtdFunc = (pessoalData?.qtd_funcionarios || 0) + (pessoalData?.qtd_pro_labore || 0);
      const qtdRecibos = (pessoalData?.qtd_recibos || 0);
      const teveTrabalhista = pessoalData?.possui_vt || pessoalData?.possui_va || pessoalData?.possui_vc;
      const { count: qtdRecalculos } = await supabase.from("recalculos").select("*", { count: 'exact', head: true }).eq("empresa_id", empresaId).eq("competencia", comp);

      const { total: valorTotal, detalhes } = calculateTotal(config, qtdFunc, (qtdRecalculos as number) || 0, teveTrabalhista || false, qtdRecibos);

      setMensalForms(prev => ({
        ...prev, [empresaId]: {
          competencia: comp, qtd_funcionarios: qtdFunc, qtd_recalculos: (qtdRecalculos as number) || 0,
          qtd_recibos: qtdRecibos,
          teve_encargo_trabalhista: teveTrabalhista || false, valor_total: valorTotal,
          detalhes_calculo: detalhes, empresa_id: empresaId,
          data_vencimento: "", data_envio: "", forma_envio: "", status: "pendente", pago: false, observacoes: { texto: "" }
        }
      }));
    } catch (err: any) { toast.error("Erro ao gerar mês: " + err.message); }
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";

  if (loadingPaginated && paginatedData.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Gestão <span className="text-primary/90">Financeira</span></h1>
            <FavoriteToggleButton moduleId="honorarios" />
            {isFetchingHonorarios && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 shadow-sm animate-pulse ml-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-tight">Sincronizando...</span>
              </div>
            )}
          </div>
          <p className="subtitle-premium">Controle de honorários, serviços extras e faturamento mensal.</p>
        </div>
        
        <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/50 w-full max-w-sm shadow-sm h-14 items-center">
          <button
            onClick={() => setMainTab("empresas")}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mainTab === "empresas" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/30"}`}
          >
            Individual
          </button>
          <button
            onClick={() => setMainTab("geral")}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mainTab === "geral" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/30"}`}
          >
            Consolidado
          </button>
        </div>
      </div>

      {mainTab === "geral" ? (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <HonorariosGeralView
            geralData={listGeral}
            esporadicosData={listEsporadicos}
            revenueTrend={revenueTrend}
            todasEmpresas={todasEmpresas as any}
            globalCompetencia={globalCompetencia}
            setGlobalCompetencia={setGlobalCompetencia}
            onToggleMensalPago={(id, current) => saveMensal.mutate({ id, pago: !current })}
            onToggleMensalStatus={(id, current) => saveMensal.mutate({ id, status: current === "enviada" ? "gerada" : "enviada" })}
            onToggleEsporadicoPago={(id, current) => saveEsporadico.mutate({ id, pago: !current } as ServicoEsporadico)}
            onDeleteEsporadico={(id) => deleteEsporadico.mutate(id)}
            onSaveEsporadico={(data) => saveEsporadico.mutate({ ...data, competencia: globalCompetencia } as ServicoEsporadico)}
            onActionGerar={async (empresaId) => {
              const empresa = todasEmpresas.find(e => e.id === empresaId);
              if (empresa) {
                if (empresa.situacao === "paralisada") setActiveStatusTab("paralisadas");
                else if (empresa.situacao === "baixada") setActiveStatusTab("baixadas");
                else if (empresa.porte_empresa === "mei") setActiveStatusTab("mei");
                else setActiveStatusTab("ativas");
              }

              setMainTab("empresas");
              setExpanded(empresaId);
              setActiveTabs(prev => ({ ...prev, [empresaId]: "mensal" }));
              setCompetenciaSelecionada(prev => ({ ...prev, [empresaId]: globalCompetencia }));

              const { data: config } = await supabase.from("honorarios_config").select("*").eq("empresa_id", empresaId).maybeSingle();
              const finalConfig: Partial<HonorarioConfig> = (config as unknown as Partial<HonorarioConfig>) || { empresa_id: empresaId, valor_honorario: 0, valor_por_funcionario: 0, valor_por_recalculo: 0, valor_trabalhista: 0, outros_servicos: [] };

              setConfigs(prev => ({ ...prev, [empresaId]: finalConfig }));
              setConfigForms(prev => ({ ...prev, [empresaId]: { ...finalConfig } }));

              const { data: mensal } = await supabase.from("honorarios_mensal").select("*").eq("empresa_id", empresaId).order('competencia', { ascending: false });
              setMensalData(prev => ({ ...prev, [empresaId]: (mensal as unknown as HonorarioMensal[]) || [] }));

              const { data: pessoalData } = await supabase.from("pessoal").select("*").eq("empresa_id", empresaId).eq("competencia", globalCompetencia).maybeSingle();
              const qtdFunc = (pessoalData?.qtd_funcionarios || 0) + (pessoalData?.qtd_pro_labore || 0);
              const qtdRecibos = (pessoalData?.qtd_recibos || 0);
              const teveTrabalhista = pessoalData?.possui_vt || pessoalData?.possui_va || pessoalData?.possui_vc;
              const { count: qtdRecalculos } = await supabase.from("recalculos").select("*", { count: 'exact', head: true }).eq("empresa_id", empresaId).eq("competencia", globalCompetencia);

              const { total: valorTotal, detalhes } = calculateTotal(finalConfig, qtdFunc, (qtdRecalculos as number) || 0, teveTrabalhista || false, qtdRecibos);

              setMensalForms(prev => ({
                ...prev, [empresaId]: {
                  competencia: globalCompetencia,
                  qtd_funcionarios: qtdFunc,
                  qtd_recalculos: (qtdRecalculos as number) || 0,
                  qtd_recibos: qtdRecibos,
                  teve_encargo_trabalhista: teveTrabalhista || false,
                  valor_total: valorTotal,
                  detalhes_calculo: detalhes,
                  empresa_id: empresaId,
                  data_vencimento: "", data_envio: "", forma_envio: "", status: "pendente", pago: false, observacoes: { texto: "" }
                }
              }));

              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdateValor={(id, val) => saveMensal.mutate({ id, valor_total: val })}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
             <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar empresa por nome ou CNPJ..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="w-full pl-12 pr-4 h-14 bg-card border border-border/60 rounded-2xl focus:ring-2 focus:ring-primary outline-none text-xs shadow-sm font-bold transition-all placeholder:text-muted-foreground/60" 
                />
              </div>

              <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/50 overflow-x-auto no-scrollbar gap-1 w-full md:w-auto h-14 items-center">
                {[
                  { id: "ativas", label: "Ativas" }, 
                  { id: "mei", label: "MEI" }, 
                  { id: "paralisadas", label: "Paralisadas" }, 
                  { id: "baixadas", label: "Baixadas" }, 
                  { id: "entregue", label: "Entregues" }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveStatusTab(t.id as any)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeStatusTab === t.id ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/30"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
          </div>

          <div className="animate-in fade-in zoom-in-95 duration-500">
            <HonorariosEmpresasView
              empresas={paginatedData as any}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              activeTabs={activeTabs}
              setActiveTab={(id, tab) => setActiveTabs(prev => ({ ...prev, [id]: tab }))}
              configs={configs}
              configForms={configForms}
              onUpdateConfigField={(id, f, v) => setConfigForms(prev => ({ ...prev, [id]: { ...prev[id], [f]: v } }))}
              onAddOutroServico={(id) => setConfigForms(prev => ({ ...prev, [id]: { ...prev[id], outros_servicos: [...(prev[id]?.outros_servicos || []), { descricao: "", valor: 0 }] } }))}
              onUpdateOutroServico={(id, idx, f, v) => setConfigForms(prev => {
                const outros = [...(prev[id]?.outros_servicos || [])];
                outros[idx] = { ...outros[idx], [f]: v };
                return { ...prev, [id]: { ...prev[id], outros_servicos: outros } };
              })}
              onRemoveOutroServico={(id, idx) => setConfigForms(prev => {
                const outros = [...(prev[id]?.outros_servicos || [])];
                outros.splice(idx, 1);
                return { ...prev, [id]: { ...prev[id], outros_servicos: outros } };
              })}
              onSaveConfig={(id) => {
                const form = configForms[id];
                const finalizedFields = {
                  valor_honorario: parseCurrency(form?.valor_honorario),
                  valor_por_funcionario: parseCurrency(form?.valor_por_funcionario),
                  valor_por_recalculo: parseCurrency(form?.valor_por_recalculo),
                  valor_trabalhista: parseCurrency(form?.valor_trabalhista),
                  valor_por_recibo: parseCurrency(form?.valor_por_recibo),
                  outros_servicos: (form?.outros_servicos || []).map((s: any) => ({ ...s, valor: parseCurrency(s.valor) }))
                };
                const payload = { ...form, ...finalizedFields };

                saveConfig.mutate(payload as any, {
                  onSuccess: () => {
                    setConfigs(prev => ({ ...prev, [id]: payload }));
                  }
                });
              }}
              mensalData={mensalData}
              mensalForms={mensalForms as any}
              onUpdateMensalField={(id, f, v) => setMensalForms(prev => ({ ...prev, [id]: { ...prev[id], [f]: v } }))}
              onSaveMensal={async (id) => {
                const form = mensalForms[id];
                await saveMensal.mutateAsync({
                  ...form,
                  data_vencimento: form?.data_vencimento || null,
                  data_envio: form?.data_envio || null,
                  observacoes: form?.observacoes ? { texto: typeof form.observacoes === 'string' ? form.observacoes : form.observacoes.texto } : null
                } as any);
                setMensalForms(prev => { const n = { ...prev }; delete n[id]; return n; });
                const { data: mensal } = await supabase.from("honorarios_mensal").select("*").eq("empresa_id", id).order('competencia', { ascending: false });
                setMensalData(prev => ({ ...prev, [id]: (mensal as unknown as HonorarioMensal[]) || [] }));
              }}
              onGenerateMonth={handleGenerateMonth}
              onStartEditMensal={(id, record) => {
                setCompetenciaSelecionada(prev => ({ ...prev, [id]: record.competencia }));
                setMensalForms(prev => ({ ...prev, [id]: { ...record, observacoes: { texto: record.observacoes?.texto || "" } } }));
              }}
              competenciaSelecionada={competenciaSelecionada}
              setCompetenciaSelecionada={(id, v) => setCompetenciaSelecionada(prev => ({ ...prev, [id]: v }))}
              onCancelMensalForm={(id) => setMensalForms(prev => { const n = { ...prev }; delete n[id]; return n; })}
              pagination={pagination}
              onPageChange={(page) => setPagination(prev => ({ ...prev, pageIndex: page }))}
              totalCount={totalCount}
              loading={loadingPaginated}
              onUpdateMensalValor={async (empId, recId, val) => {
                await saveMensal.mutateAsync({ id: recId, valor_total: val } as any);
                const { data: mensal } = await supabase.from("honorarios_mensal").select("*").eq("empresa_id", empId).order('competencia', { ascending: false });
                setMensalData(prev => ({ ...prev, [empId]: (mensal as unknown as HonorarioMensal[]) || [] }));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HonorariosPage;
