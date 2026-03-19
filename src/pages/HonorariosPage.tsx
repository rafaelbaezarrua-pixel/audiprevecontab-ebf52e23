
import React, { useEffect, useState, useCallback } from "react";
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
  const [mainTab, setMainTab] = useState<"empresas" | "geral">("empresas");
  const [globalCompetencia, setGlobalCompetencia] = useState(new Date().toISOString().slice(0, 7));
  
  const { 
    listGeral, listEsporadicos, revenueTrend, loading: loadingHonorarios,
    saveConfig, saveMensal, saveEsporadico, deleteEsporadico 
  } = useHonorarios(globalCompetencia);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, "mensal" | "configuracao">>({});
  const [activeStatusTab, setActiveStatusTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 12 });
  const [paginatedData, setPaginatedData] = useState<Empresa[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingPaginated, setLoadingPaginated] = useState(false);

  const [configs, setConfigs] = useState<Record<string, Partial<HonorarioConfig>>>({});
  const [mensalData, setMensalData] = useState<Record<string, HonorarioMensal[]>>({});
  const [configForms, setConfigForms] = useState<Record<string, Partial<HonorarioConfig>>>({});
  const [mensalForms, setMensalForms] = useState<Record<string, Partial<HonorarioMensal>>>({});
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<Record<string, string>>({});
  const [todasEmpresas, setTodasEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    if (mainTab === 'geral' && todasEmpresas.length === 0) {
      const fetchAll = async () => {
        const { data } = await supabase.from("empresas").select("*").order("nome_empresa");
        setTodasEmpresas((data as Empresa[]) || []);
      };
      fetchAll();
    }
  }, [mainTab, todasEmpresas.length]);

  const loadPaginatedData = useCallback(async () => {
    setLoadingPaginated(true);
    try {
      const { data, count } = await getPaginatedEmpresas(
        pagination.pageIndex,
        pagination.pageSize,
        search,
        activeStatusTab,
        "todos",
        "honorarios",
        user?.id
      );
      setPaginatedData(data);
      setTotalCount(count);
    } catch (err) {
      console.error("Erro ao carregar empresas paginadas:", err);
    } finally {
      setLoadingPaginated(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, search, activeStatusTab, user?.id, getPaginatedEmpresas]);

  useEffect(() => {
    loadPaginatedData();
  }, [loadPaginatedData]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [search, activeStatusTab]);

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm w-full sm:w-auto">
          <FavoriteToggleButton moduleId="honorarios" />
          <div>
            <h2 className="text-lg font-bold text-card-foreground">Honorários Extras</h2>
            <p className="text-xs text-muted-foreground">Gestão de honorários e faturamento.</p>
          </div>
        </div>
        <div className="flex bg-muted/30 p-1 rounded-xl w-full sm:w-fit">
        <button
          className={`flex-1 sm:flex-none uppercase tracking-wider text-xs font-bold px-6 py-2.5 rounded-lg transition-all duration-200 ${mainTab === "empresas" ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setMainTab("empresas")}
        >
          Painel de Empresas
        </button>
        <button
          className={`flex-1 sm:flex-none uppercase tracking-wider text-xs font-bold px-6 py-2.5 rounded-lg transition-all duration-200 ${mainTab === "geral" ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setMainTab("geral")}
        >
          Controle Geral (Resumo)
        </button>
      </div>
      </div>

      {mainTab === "geral" ? (
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
            // 1. Identify correct sub-tab for the company
            const empresa = todasEmpresas.find(e => e.id === empresaId);
            if (empresa) {
              if (empresa.situacao === "paralisada") setActiveStatusTab("paralisadas");
              else if (empresa.situacao === "baixada") setActiveStatusTab("baixadas");
              else if (empresa.porte_empresa === "mei") setActiveStatusTab("mei");
              else setActiveStatusTab("ativas");
            }

            // 2. Switch tab and expand
            setMainTab("empresas");
            setExpanded(empresaId);
            setActiveTabs(prev => ({ ...prev, [empresaId]: "mensal" }));
            setCompetenciaSelecionada(prev => ({ ...prev, [empresaId]: globalCompetencia }));
            
            // 3. Load config and generate (mimic toggleExpand + handleGenerateMonth)
            const { data: config } = await supabase.from("honorarios_config").select("*").eq("empresa_id", empresaId).maybeSingle();
            const finalConfig: Partial<HonorarioConfig> = (config as unknown as Partial<HonorarioConfig>) || { empresa_id: empresaId, valor_honorario: 0, valor_por_funcionario: 0, valor_por_recalculo: 0, valor_trabalhista: 0, outros_servicos: [] };
            
            setConfigs(prev => ({ ...prev, [empresaId]: finalConfig }));
            setConfigForms(prev => ({ ...prev, [empresaId]: { ...finalConfig } }));

            const { data: mensal } = await supabase.from("honorarios_mensal").select("*").eq("empresa_id", empresaId).order('competencia', { ascending: false });
            setMensalData(prev => ({ ...prev, [empresaId]: (mensal as unknown as HonorarioMensal[]) || [] }));

            // 4. Trigger generation with the loaded config
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
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="flex border-b border-border overflow-x-auto no-scrollbar">
            {["ativas", "mei", "paralisadas", "baixadas", "entregue"].map(t => (
              <button
                key={t}
                className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeStatusTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveStatusTab(t as any)}
              >
                {t === "ativas" ? "Empresas Ativas" : t === "mei" ? "Empresas MEI" : t === "paralisadas" ? "Empresas Paralisadas" : t === "entregue" ? "Empresas Entregues" : "Empresas Baixadas"}
              </button>
            ))}
          </div>

          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className={inputCls + " pl-9"} />
          </div>

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
      )}
    </div>
  );
};

export default HonorariosPage;
