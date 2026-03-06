import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, Building2, Plus, Calendar, DollarSign, Clock, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useEmpresas } from "@/hooks/useEmpresas";

type TabType = "configuracao" | "mensal";
type MainTabType = "empresas" | "geral";

const HonorariosPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("honorarios");
  const [search, setSearch] = useState("");
  const [mainTab, setMainTab] = useState<MainTabType>("empresas");
  const [globalCompetencia, setGlobalCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [geralData, setGeralData] = useState<any[]>([]);

  // View: Empresas States
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, TabType>>({});
  const [activeStatusTab, setActiveStatusTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas">("ativas");

  // Data States for View: Empresas
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [mensalData, setMensalData] = useState<Record<string, any[]>>({});
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [mensalForm, setMensalForm] = useState<Record<string, any>>({});
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mainTab === "geral") {
      loadGeralData();
    }
  }, [mainTab, globalCompetencia]);

  const loadGeralData = async () => {
    const { data: records, error } = await supabase
      .from("honorarios_mensal")
      .select(`
        *,
        empresas (nome_empresa)
      `)
      .eq("competencia", globalCompetencia);

    if (error) {
      toast.error("Erro ao carregar dados do mês: " + error.message);
      return;
    }

    setGeralData(records || []);
  };

  const toggleGlobalPago = async (id: string, currentValue: boolean) => {
    try {
      await supabase.from("honorarios_mensal").update({ pago: !currentValue }).eq("id", id);
      toast.success(`Status de pagamento atualizado.`);
      loadGeralData();
    } catch (err: any) {
      toast.error("Erro ao atualizar status: " + err.message);
    }
  };

  // ------------------ Existing Logic for View: Empresas ------------------ //
  const toggleExpand = async (empresaId: string) => {
    if (expanded === empresaId) {
      setExpanded(null);
      return;
    }
    setExpanded(empresaId);
    if (!activeTab[empresaId]) setActiveTab(prev => ({ ...prev, [empresaId]: "mensal" }));
    if (!competenciaSelecionada[empresaId]) setCompetenciaSelecionada(prev => ({ ...prev, [empresaId]: new Date().toISOString().slice(0, 7) }));
    await loadConfig(empresaId);
    await loadMensal(empresaId);
  };

  const loadConfig = async (empresaId: string) => {
    const { data } = await supabase.from("honorarios_config").select("*").eq("empresa_id", empresaId).maybeSingle();
    const config = data || { valor_honorario: 0, valor_por_funcionario: 0, valor_por_recalculo: 0, valor_trabalhista: 0, outros_servicos: [] };
    if (config && !config.outros_servicos) config.outros_servicos = [];
    setConfigs(prev => ({ ...prev, [empresaId]: config }));
    setConfigForm(prev => ({ ...prev, [empresaId]: { ...config } }));
  };

  const loadMensal = async (empresaId: string) => {
    const { data } = await supabase.from("honorarios_mensal").select("*").eq("empresa_id", empresaId).order('competencia', { ascending: false });
    setMensalData(prev => ({ ...prev, [empresaId]: data || [] }));
  };

  const handleSaveConfig = async (empresaId: string) => {
    const form = configForm[empresaId];
    try {
      const payload = {
        empresa_id: empresaId,
        valor_honorario: parseFloat(form.valor_honorario) || 0,
        valor_por_funcionario: parseFloat(form.valor_por_funcionario) || 0,
        valor_por_recalculo: parseFloat(form.valor_por_recalculo) || 0,
        valor_trabalhista: parseFloat(form.valor_trabalhista) || 0,
        outros_servicos: form.outros_servicos || []
      };
      if (configs[empresaId]?.id) await supabase.from("honorarios_config").update(payload).eq("id", configs[empresaId].id);
      else await supabase.from("honorarios_config").insert(payload);
      toast.success("Configuração de honorários salva!");
      loadConfig(empresaId);
    } catch (err: any) { toast.error("Erro ao salvar: " + err.message); }
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

  const handleGenerateMonth = async (empresaId: string) => {
    const comp = competenciaSelecionada[empresaId];
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

      setMensalForm(prev => ({
        ...prev, [empresaId]: {
          competencia: comp, qtd_funcionarios: qtdFunc, qtd_recalculos: qtdRecalculos || 0,
          teve_encargo_trabalhista: teveTrabalhista || false, valor_total: valorTotal,
          detalhes_calculo: detalhes,
          data_vencimento: "", data_envio: "", forma_envio: "", status: "pendente", pago: false, observacoes: ""
        }
      }));
    } catch (err: any) { toast.error("Erro ao gerar mês: " + err.message); }
  };

  const handleSaveMensal = async (empresaId: string) => {
    const form = mensalForm[empresaId];
    if (!form) return;
    try {
      const payload = {
        empresa_id: empresaId, competencia: form.competencia, qtd_funcionarios: form.qtd_funcionarios,
        qtd_recalculos: form.qtd_recalculos, teve_encargo_trabalhista: form.teve_encargo_trabalhista,
        valor_total: form.valor_total, data_vencimento: form.data_vencimento || null, data_envio: form.data_envio || null,
        forma_envio: form.forma_envio || null, status: form.status, pago: form.pago,
        detalhes_calculo: form.detalhes_calculo || [],
        observacoes: form.observacoes ? { texto: form.observacoes } : null
      };

      const existingRecord = mensalData[empresaId]?.find((m: any) => m.competencia === form.competencia);
      if (existingRecord) await supabase.from("honorarios_mensal").update(payload).eq("id", existingRecord.id);
      else await supabase.from("honorarios_mensal").insert(payload);

      toast.success("Controle mensal salvo!");
      setMensalForm(prev => { const newForm = { ...prev }; delete newForm[empresaId]; return newForm; });
      loadMensal(empresaId);
    } catch (err: any) { toast.error("Erro ao salvar controle: " + err.message); }
  };

  const startEditMensal = (empresaId: string, record: any) => {
    setCompetenciaSelecionada(prev => ({ ...prev, [empresaId]: record.competencia }));
    setMensalForm(prev => ({ ...prev, [empresaId]: { ...record, observacoes: record.observacoes?.texto || "", detalhes_calculo: record.detalhes_calculo || [] } }));
  };

  const updateConfigForm = (id: string, field: string, value: any) => {
    setConfigForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const updateMensalForm = (id: string, field: string, value: any) => {
    setMensalForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const addOutroServico = (empresaId: string) => {
    setConfigForm(prev => {
      const form = prev[empresaId] || {};
      const outros = form.outros_servicos || [];
      return { ...prev, [empresaId]: { ...form, outros_servicos: [...outros, { descricao: "", valor: 0 }] } };
    });
  };

  const updateOutroServico = (empresaId: string, index: number, field: string, value: any) => {
    setConfigForm(prev => {
      const form = prev[empresaId];
      const outros = [...(form.outros_servicos || [])];
      outros[index] = { ...outros[index], [field]: value };
      return { ...prev, [empresaId]: { ...form, outros_servicos: outros } };
    });
  };

  const removeOutroServico = (empresaId: string, index: number) => {
    setConfigForm(prev => {
      const form = prev[empresaId];
      const outros = [...(form.outros_servicos || [])];
      outros.splice(index, 1);
      return { ...prev, [empresaId]: { ...form, outros_servicos: outros } };
    });
  };

  const filtered = empresas.filter(e => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);

    let matchTab = false;
    if (activeStatusTab === "ativas") {
      matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa !== "mei";
    } else if (activeStatusTab === "mei") {
      matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa === "mei";
    } else if (activeStatusTab === "paralisadas") {
      matchTab = e.situacao === "paralisada";
    } else if (activeStatusTab === "baixadas") {
      matchTab = e.situacao === "baixada";
    }

    return matchSearch && matchTab;
  });
  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Derived calculations for Geral View
  const totalValorAgregado = geralData.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
  const totalPago = geralData.filter(d => d.pago).reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
  const totalPendente = totalValorAgregado - totalPago;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">


      {/* Main Tab Switcher */}
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

      {/* VIEW: CONTROLE GERAL */}
      {mainTab === "geral" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-card border border-border p-4 rounded-xl shadow-sm gap-4">
            <h2 className="font-semibold text-card-foreground">Resumo de Honorários Mensais</h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Competência:</label>
              <input
                type="month"
                value={globalCompetencia}
                onChange={(e) => setGlobalCompetencia(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary w-full sm:w-auto"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground uppercase">Total Calculado</p>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign size={16} className="text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-card-foreground">{formatCurrency(totalValorAgregado)}</p>
              <p className="text-xs text-muted-foreground mt-1">De todos os honorários gerados no mês</p>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-success uppercase">Total Recebido (Pago)</p>
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle size={16} className="text-success" />
                </div>
              </div>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalPago)}</p>
              <p className="text-xs text-success/80 mt-1">Valores marcados como pagos</p>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-warning uppercase">Pendente / Em Aberto</p>
                <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                  <Clock size={16} className="text-warning" />
                </div>
              </div>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</p>
              <p className="text-xs text-warning/80 mt-1">Aguardando recebimento</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Empresa</th>
                    <th className="px-5 py-4 font-semibold text-right">Valor Calculado</th>
                    <th className="px-5 py-4 font-semibold text-center">Vencimento</th>
                    <th className="px-5 py-4 font-semibold text-center">Status</th>
                    <th className="px-5 py-4 font-semibold text-center">Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {geralData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                        Nenhum honorário registrado para a competência {globalCompetencia}.
                      </td>
                    </tr>
                  ) : (
                    geralData.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4 font-medium text-card-foreground">
                          {record.empresas?.nome_empresa}
                        </td>
                        <td className="px-5 py-4 font-bold text-primary text-right">
                          {formatCurrency(record.valor_total)}
                        </td>
                        <td className="px-5 py-4 text-center text-muted-foreground">
                          {record.data_vencimento ? format(new Date(record.data_vencimento), 'dd/MM/yyyy') : '—'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${record.status === "enviada" ? "bg-success/10 text-success border border-success/20" :
                            record.status === "gerada" ? "bg-primary/10 text-primary border border-primary/20" : "bg-warning/10 text-warning border border-warning/20"
                            }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => toggleGlobalPago(record.id, record.pago)}
                            className={`flex items-center gap-2 justify-center w-32 mx-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${record.pago
                              ? "bg-success text-success-foreground shadow-md hover:bg-success/90"
                              : "bg-muted text-muted-foreground border border-border hover:bg-muted/80 hover:text-foreground"
                              }`}
                          >
                            {record.pago ? <><CheckCircle size={14} /> PAGO</> : <><Clock size={14} /> PENDENTE</>}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: EMPRESAS (Existing content) */}
      {mainTab === "empresas" && (
        <div className="space-y-4 animate-fade-in">

          <div className="flex border-b border-border overflow-x-auto no-scrollbar">
            <button
              className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeStatusTab === "ativas"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setActiveStatusTab("ativas")}
            >
              Empresas Ativas
            </button>
            <button
              className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeStatusTab === "mei"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setActiveStatusTab("mei")}
            >
              Empresas MEI
            </button>
            <button
              className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeStatusTab === "paralisadas"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setActiveStatusTab("paralisadas")}
            >
              Empresas Paralisadas
            </button>
            <button
              className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeStatusTab === "baixadas"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setActiveStatusTab("baixadas")}
            >
              Empresas Baixadas
            </button>
          </div>

          <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className={inputCls + " pl-9"} /></div>
          <div className="space-y-3">
            {filtered.map(emp => {
              const isOpen = expanded === emp.id;
              const tab = activeTab[emp.id] || "mensal";
              const cForm = configForm[emp.id] || {};
              const mForm = mensalForm[emp.id];
              const hasMensalRecords = mensalData[emp.id] && mensalData[emp.id].length > 0;

              return (
                <div key={emp.id} className="module-card !p-0 overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 size={16} className="text-primary" /></div><div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
                    {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>

                  {isOpen && (
                    <div className="border-t border-border bg-muted/10">
                      <div className="flex border-b border-border">
                        <button className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "mensal" ? "text-primary border-b-2 border-primary bg-background/50" : "text-muted-foreground hover:bg-muted/50"}`} onClick={() => setActiveTab(prev => ({ ...prev, [emp.id]: "mensal" }))}>Controle Mensal</button>
                        <button className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "configuracao" ? "text-primary border-b-2 border-primary bg-background/50" : "text-muted-foreground hover:bg-muted/50"}`} onClick={() => setActiveTab(prev => ({ ...prev, [emp.id]: "configuracao" }))}>Configuração</button>
                      </div>

                      <div className="p-5">
                        {tab === "configuracao" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><label className={labelCls}>Valor Base (Honorário Mensal)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span><input type="number" step="0.01" value={cForm.valor_honorario || ""} onChange={e => updateConfigForm(emp.id, "valor_honorario", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" /></div></div>
                              <div><label className={labelCls}>Valor Adicion. por Funcionário</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span><input type="number" step="0.01" value={cForm.valor_por_funcionario || ""} onChange={e => updateConfigForm(emp.id, "valor_por_funcionario", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" /></div></div>
                              <div><label className={labelCls}>Valor Adicion. por Recálculo</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span><input type="number" step="0.01" value={cForm.valor_por_recalculo || ""} onChange={e => updateConfigForm(emp.id, "valor_por_recalculo", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" /></div></div>
                              <div><label className={labelCls}>Valor Adicion. Trabalhista (Fixo)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span><input type="number" step="0.01" value={cForm.valor_trabalhista || ""} onChange={e => updateConfigForm(emp.id, "valor_trabalhista", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" /></div></div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-border">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-card-foreground">Serviços Adicionais (Extra)</h4>
                                <button onClick={() => addOutroServico(emp.id)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
                                  <Plus size={14} /> Adicionar Serviço
                                </button>
                              </div>
                              <div className="space-y-3">
                                {cForm.outros_servicos?.map((servico: any, idx: number) => (
                                  <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-background p-3 rounded-lg border border-border">
                                    <div className="flex-1 w-full text-left">
                                      <label className={labelCls}>Descrição</label>
                                      <input type="text" value={servico.descricao || ""} onChange={e => updateOutroServico(emp.id, idx, "descricao", e.target.value)} className={inputCls} placeholder="Ex: Imposto Sindical, Taxa Extra..." />
                                    </div>
                                    <div className="w-full sm:w-1/3 text-left">
                                      <label className={labelCls}>Valor</label>
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                        <input type="number" step="0.01" value={servico.valor || ""} onChange={e => updateOutroServico(emp.id, idx, "valor", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" />
                                      </div>
                                    </div>
                                    <button onClick={() => removeOutroServico(emp.id, idx)} className="p-2 sm:mb-[2px] rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors" title="Excluir Serviço">
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                ))}
                                {(!cForm.outros_servicos || cForm.outros_servicos.length === 0) && (
                                  <p className="text-xs text-muted-foreground italic">Nenhum serviço adicional configurado.</p>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end pt-4"><button onClick={() => handleSaveConfig(emp.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Save size={16} /> Salvar Configuração</button></div>
                          </div>
                        )}

                        {tab === "mensal" && (
                          <div className="space-y-6">
                            {!mForm && (
                              <div className="flex flex-col sm:flex-row items-end gap-3 bg-background p-4 rounded-lg border border-border">
                                <div className="flex-1 w-full"><label className={labelCls}>Nova Competência</label><input type="month" value={competenciaSelecionada[emp.id] || ""} onChange={e => setCompetenciaSelecionada(prev => ({ ...prev, [emp.id]: e.target.value }))} className={inputCls} /></div>
                                <button onClick={() => handleGenerateMonth(emp.id)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-semibold transition-colors"><Plus size={16} /> Gerar ou Editar Mês</button>
                              </div>
                            )}

                            {mForm && (
                              <div className="bg-background p-5 rounded-lg border border-primary/20 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b border-border pb-3">
                                  <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2"><Calendar size={16} className="text-primary" /> Competência: {mForm.competencia}</h3>
                                  <button onClick={() => setMensalForm(prev => { const n = { ...prev }; delete n[emp.id]; return n; })} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
                                  <div><label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Qtd. Funcionários</label><p className="text-sm text-card-foreground font-medium">{mForm.qtd_funcionarios}</p></div>
                                  <div><label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Qtd. Recálculos</label><p className="text-sm text-card-foreground font-medium">{mForm.qtd_recalculos}</p></div>
                                  <div><label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Encargos Trab.</label><p className="text-sm text-card-foreground font-medium">{mForm.teve_encargo_trabalhista ? "Sim" : "Não"}</p></div>
                                  <div><label className="block text-[10px] uppercase text-primary font-bold mb-1">Valor Total Calculado</label><p className="text-lg text-primary font-bold">{formatCurrency(mForm.valor_total)}</p></div>
                                </div>

                                {mForm.detalhes_calculo && mForm.detalhes_calculo.length > 0 && (
                                  <div className="bg-muted/10 border border-border rounded-lg p-4">
                                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                      <DollarSign size={14} /> Detalhamento do Cálculo
                                    </h4>
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground uppercase border-b border-border pb-1">
                                        <div className="col-span-2">Descrição</div>
                                        <div className="text-right">Qtd x Valor</div>
                                        <div className="text-right">Total</div>
                                      </div>
                                      {mForm.detalhes_calculo.map((det: any, idx: number) => (
                                        <div key={idx} className="grid grid-cols-4 text-xs items-center py-1">
                                          <div className="col-span-2 font-medium text-card-foreground line-clamp-1" title={det.rotulo}>{det.rotulo}</div>
                                          <div className="text-right text-muted-foreground">
                                            {det.qtd} x {formatCurrency(det.vlrUnit)}
                                          </div>
                                          <div className="text-right font-bold text-card-foreground">
                                            {formatCurrency(det.vlrTotal)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div><label className={labelCls}>Data Vencimento</label><input type="date" value={mForm.data_vencimento || ""} onChange={e => updateMensalForm(emp.id, "data_vencimento", e.target.value)} className={inputCls} /></div>
                                  <div><label className={labelCls}>Data Envio</label><input type="date" value={mForm.data_envio || ""} onChange={e => updateMensalForm(emp.id, "data_envio", e.target.value)} className={inputCls} /></div>
                                  <div><label className={labelCls}>Forma Envio</label><input type="text" value={mForm.forma_envio || ""} onChange={e => updateMensalForm(emp.id, "forma_envio", e.target.value)} className={inputCls} placeholder="Ex: WhatsApp, Email" /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                  <div><label className={labelCls}>Status</label><select value={mForm.status || "pendente"} onChange={e => updateMensalForm(emp.id, "status", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select></div>
                                  <div className="flex items-center gap-2 pt-4"><input type="checkbox" id={`pago-${emp.id}`} checked={mForm.pago || false} onChange={e => updateMensalForm(emp.id, "pago", e.target.checked)} className="w-4 h-4 rounded text-primary border-border" /><label htmlFor={`pago-${emp.id}`} className="text-sm font-medium text-card-foreground cursor-pointer">Honorário Pago</label></div>
                                  <div><label className={labelCls}>Valor Ajustado Manualmente</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span><input type="number" step="0.01" value={mForm.valor_total || ""} onChange={e => updateMensalForm(emp.id, "valor_total", parseFloat(e.target.value) || 0)} className={`${inputCls} pl-9`} /></div></div>
                                </div>
                                <div><label className={labelCls}>Observações</label><textarea value={mForm.observacoes || ""} onChange={e => updateMensalForm(emp.id, "observacoes", e.target.value)} className={`${inputCls} min-h-[80px] resize-y`} placeholder="Observações..." /></div>
                                <div className="flex justify-end pt-2"><button onClick={() => handleSaveMensal(emp.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Save size={16} /> Salvar Mês</button></div>
                              </div>
                            )}

                            {hasMensalRecords && !mForm ? (
                              <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-sm text-left">
                                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Competência</th><th className="px-4 py-3 font-medium">Valor Total</th><th className="px-4 py-3 font-medium">Vencimento</th><th className="px-4 py-3 font-medium">Status / Pago</th><th className="px-4 py-3 font-medium text-right">Ações</th></tr></thead>
                                  <tbody className="divide-y divide-border bg-background">
                                    {mensalData[emp.id].map((record: any) => (
                                      <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3 font-medium text-card-foreground">{record.competencia}</td>
                                        <td className="px-4 py-3 text-primary font-semibold">{formatCurrency(record.valor_total)}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{record.data_vencimento ? format(new Date(record.data_vencimento), 'dd/MM/yyyy') : '—'}</td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${record.status === "enviada" ? "bg-success/10 text-success" : record.status === "gerada" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>{record.status}</span>
                                            {record.pago ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-success/10 text-success border border-success/20">PAGO</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-muted-foreground border border-border">PENDENTE</span>}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-right"><button onClick={() => startEditMensal(emp.id, record)} className="text-primary hover:underline text-xs font-medium">Editar</button></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : !mForm ? <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">Nenhum controle mensal registrado para esta empresa.</div> : null}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground module-card">Nenhuma empresa encontrada com "{(search)}"</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default HonorariosPage;
