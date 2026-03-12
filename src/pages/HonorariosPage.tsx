
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useHonorarios } from "@/hooks/useHonorarios";
import { HonorariosGeralView } from "@/components/honorarios/HonorariosGeralView";
import { HonorariosEmpresasView } from "@/components/honorarios/HonorariosEmpresasView";
import { HonorarioConfig, HonorarioMensal } from "@/types/honorarios";

const HonorariosPage: React.FC = () => {
  const { empresas, loading: loadingEmpresas } = useEmpresas("honorarios");
  const [search, setSearch] = useState("");
  const [mainTab, setMainTab] = useState<"empresas" | "geral">("empresas");
  const [globalCompetencia, setGlobalCompetencia] = useState(new Date().toISOString().slice(0, 7));
  
  const { 
    listGeral, listEsporadicos, revenueTrend, loading: loadingHonorarios,
    saveConfig, saveMensal, saveEsporadico, deleteEsporadico 
  } = useHonorarios(globalCompetencia);

  const { empresas: todasEmpresas } = useEmpresas("honorarios");

  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, "mensal" | "configuracao">>({});
  const [activeStatusTab, setActiveStatusTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas">("ativas");

  const [configs, setConfigs] = useState<Record<string, Partial<HonorarioConfig>>>({});
  const [mensalData, setMensalData] = useState<Record<string, HonorarioMensal[]>>({});
  const [configForms, setConfigForms] = useState<Record<string, Partial<HonorarioConfig>>>({});
  const [mensalForms, setMensalForms] = useState<Record<string, any>>({});
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<Record<string, string>>({});

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
    const finalConfig = (config as any) || { empresa_id: empresaId, valor_honorario: 0, valor_por_funcionario: 0, valor_por_recalculo: 0, valor_trabalhista: 0, outros_servicos: [] };
    setConfigs(prev => ({ ...prev, [empresaId]: finalConfig }));
    setConfigForms(prev => ({ ...prev, [empresaId]: { ...finalConfig } }));

    const { data: mensal } = await supabase.from("honorarios_mensal").select("*").eq("empresa_id", empresaId).order('competencia', { ascending: false });
    setMensalData(prev => ({ ...prev, [empresaId]: (mensal as any) || [] }));
  };

  const parseCurrency = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val);
    if (str.includes(',')) return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
    return parseFloat(str) || 0;
  };

  const calculateTotal = (config: any, qtdFunc: number, qtdRecalculos: number, teveTrabalhista: boolean) => {
    const honorario = Number(config?.valor_honorario || 0);
    const funcVlr = Number(config?.valor_por_funcionario || 0) * qtdFunc;
    const recVlr = Number(config?.valor_por_recalculo || 0) * qtdRecalculos;
    const trabVlr = teveTrabalhista ? Number(config?.valor_trabalhista || 0) : 0;
    const outrosVlr = (config?.outros_servicos || []).reduce((sum: number, item: any) => sum + Number(item.valor || 0), 0);

    const detalhes = [
      { rotulo: "Honorário Base", qtd: 1, vlrUnit: honorario, vlrTotal: honorario },
      ...(qtdFunc > 0 ? [{ rotulo: "Funcionários/Pró-labore", qtd: qtdFunc, vlrUnit: Number(config?.valor_por_funcionario || 0), vlrTotal: funcVlr }] : []),
      ...(qtdRecalculos > 0 ? [{ rotulo: "Recálculos", qtd: qtdRecalculos, vlrUnit: Number(config?.valor_por_recalculo || 0), vlrTotal: recVlr }] : []),
      ...(teveTrabalhista ? [{ rotulo: "Encargos Trabalhistas", qtd: 1, vlrUnit: Number(config?.valor_trabalhista || 0), vlrTotal: trabVlr }] : []),
      ...(config?.outros_servicos || []).map((s: any) => ({ rotulo: s.descricao || "Serviço Adicional", qtd: 1, vlrUnit: Number(s.valor || 0), vlrTotal: Number(s.valor || 0) }))
    ];

    return { total: honorario + funcVlr + recVlr + trabVlr + outrosVlr, detalhes };
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
      const qtdFunc = pessoalData?.qtd_funcionarios || 0;
      const teveTrabalhista = pessoalData?.possui_vt || pessoalData?.possui_va || pessoalData?.possui_vc;
      const { count: qtdRecalculos } = await supabase.from("recalculos").select("*", { count: 'exact', head: true }).eq("empresa_id", empresaId).eq("competencia", comp);

      const { total: valorTotal, detalhes } = calculateTotal(config, qtdFunc, qtdRecalculos || 0, teveTrabalhista || false);

      setMensalForms(prev => ({
        ...prev, [empresaId]: {
          competencia: comp, qtd_funcionarios: qtdFunc, qtd_recalculos: qtdRecalculos || 0,
          teve_encargo_trabalhista: teveTrabalhista || false, valor_total: valorTotal,
          detalhes_calculo: detalhes, empresa_id: empresaId,
          data_vencimento: "", data_envio: "", forma_envio: "", status: "pendente", pago: false, observacoes: ""
        }
      }));
    } catch (err: any) { toast.error("Erro ao gerar mês: " + err.message); }
  };

  const filteredEmpresas = empresas.filter(e => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    let matchTab = false;
    if (activeStatusTab === "ativas") matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa !== "mei";
    else if (activeStatusTab === "mei") matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa === "mei";
    else if (activeStatusTab === "paralisadas") matchTab = e.situacao === "paralisada";
    else if (activeStatusTab === "baixadas") matchTab = e.situacao === "baixada";
    return matchSearch && matchTab;
  });

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";

  if (loadingEmpresas) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
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

      {mainTab === "geral" ? (
        <HonorariosGeralView 
          geralData={listGeral}
          esporadicosData={listEsporadicos}
          revenueTrend={revenueTrend}
          todasEmpresas={todasEmpresas}
          globalCompetencia={globalCompetencia}
          setGlobalCompetencia={setGlobalCompetencia}
          onToggleMensalPago={(id, current) => saveMensal.mutate({ id, pago: !current } as any)}
          onToggleMensalStatus={(id, current) => saveMensal.mutate({ id, status: current === "enviada" ? "gerada" : "enviada" } as any)}
          onToggleEsporadicoPago={(id, current) => saveEsporadico.mutate({ id, pago: !current } as any)}
          onDeleteEsporadico={(id) => deleteEsporadico.mutate(id)}
          onSaveEsporadico={(data) => saveEsporadico.mutate({ ...data, competencia: globalCompetencia })}
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
            const finalConfig = (config as any) || { empresa_id: empresaId, valor_honorario: 0, valor_por_funcionario: 0, valor_por_recalculo: 0, valor_trabalhista: 0, outros_servicos: [] };
            
            setConfigs(prev => ({ ...prev, [empresaId]: finalConfig }));
            setConfigForms(prev => ({ ...prev, [empresaId]: { ...finalConfig } }));

            const { data: mensal } = await supabase.from("honorarios_mensal").select("*").eq("empresa_id", empresaId).order('competencia', { ascending: false });
            setMensalData(prev => ({ ...prev, [empresaId]: (mensal as any) || [] }));

            // 4. Trigger generation with the loaded config
            const { data: pessoalData } = await supabase.from("pessoal").select("*").eq("empresa_id", empresaId).eq("competencia", globalCompetencia).maybeSingle();
            const qtdFunc = pessoalData?.qtd_funcionarios || 0;
            const teveTrabalhista = pessoalData?.possui_vt || pessoalData?.possui_va || pessoalData?.possui_vc;
            const { count: qtdRecalculos } = await supabase.from("recalculos").select("*", { count: 'exact', head: true }).eq("empresa_id", empresaId).eq("competencia", globalCompetencia);

            const { total: valorTotal, detalhes } = calculateTotal(finalConfig, qtdFunc, qtdRecalculos || 0, teveTrabalhista || false);

            setMensalForms(prev => ({
              ...prev, [empresaId]: {
                competencia: globalCompetencia,
                qtd_funcionarios: qtdFunc,
                qtd_recalculos: qtdRecalculos || 0,
                teve_encargo_trabalhista: teveTrabalhista || false,
                valor_total: valorTotal,
                detalhes_calculo: detalhes,
                empresa_id: empresaId,
                data_vencimento: "", data_envio: "", forma_envio: "", status: "pendente", pago: false, observacoes: ""
              }
            }));

            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="flex border-b border-border overflow-x-auto no-scrollbar">
            {["ativas", "mei", "paralisadas", "baixadas"].map(t => (
              <button
                key={t}
                className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeStatusTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveStatusTab(t as any)}
              >
                {t === "ativas" ? "Empresas Ativas" : t === "mei" ? "Empresas MEI" : t === "paralisadas" ? "Empresas Paralisadas" : "Empresas Baixadas"}
              </button>
            ))}
          </div>

          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className={inputCls + " pl-9"} />
          </div>

          <HonorariosEmpresasView 
            empresas={filteredEmpresas}
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
              saveConfig.mutate({
                ...form,
                valor_honorario: parseCurrency(form?.valor_honorario),
                valor_por_funcionario: parseCurrency(form?.valor_por_funcionario),
                valor_por_recalculo: parseCurrency(form?.valor_por_recalculo),
                valor_trabalhista: parseCurrency(form?.valor_trabalhista),
                outros_servicos: (form?.outros_servicos || []).map((s: any) => ({ ...s, valor: parseCurrency(s.valor) }))
              } as any);
            }}
            mensalData={mensalData}
            mensalForms={mensalForms}
            onUpdateMensalField={(id, f, v) => setMensalForms(prev => ({ ...prev, [id]: { ...prev[id], [f]: v } }))}
            onSaveMensal={async (id) => {
              const form = mensalForms[id];
              await saveMensal.mutateAsync({
                ...form,
                data_vencimento: form.data_vencimento || null,
                data_envio: form.data_envio || null,
                observacoes: form.observacoes ? { texto: typeof form.observacoes === 'string' ? form.observacoes : form.observacoes.texto } : null
              } as any);
              setMensalForms(prev => { const n = { ...prev }; delete n[id]; return n; });
              const { data: mensal } = await supabase.from("honorarios_mensal").select("*").eq("empresa_id", id).order('competencia', { ascending: false });
              setMensalData(prev => ({ ...prev, [id]: (mensal as any) || [] }));
            }}
            onGenerateMonth={handleGenerateMonth}
            onStartEditMensal={(id, record) => {
              setCompetenciaSelecionada(prev => ({ ...prev, [id]: record.competencia }));
              setMensalForms(prev => ({ ...prev, [id]: { ...record, observacoes: record.observacoes?.texto || "" } }));
            }}
            competenciaSelecionada={competenciaSelecionada}
            setCompetenciaSelecionada={(id, v) => setCompetenciaSelecionada(prev => ({ ...prev, [id]: v }))}
            onCancelMensalForm={(id) => setMensalForms(prev => { const n = { ...prev }; delete n[id]; return n; })}
          />
        </div>
      )}
    </div>
  );
};

export default HonorariosPage;
