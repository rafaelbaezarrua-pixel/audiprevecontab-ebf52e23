import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, Save, Building2, FileUp, Settings, Activity, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useFiscal } from "@/hooks/useFiscal";
import { FiscalRecord } from "@/types/fiscal";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { TaxGuideUploader, ProcessingResult } from "@/components/TaxGuideUploader";
import { FiscalParametersDialog } from "@/components/FiscalParametersDialog";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDateBR, formatMonthYearBR, cn } from "@/lib/utils";
import { EmpresaAccordion } from "@/components/EmpresaAccordion";

const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI", simei: "Simei" };


const FiscalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const { empresas, loading: empresasLoading } = useEmpresas("fiscal");
  const { fiscalData, loading: fiscalLoading, saveFiscalRecord } = useFiscal(competencia);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"simples" | "lucro" | "mei" | "outras">("simples");
  const [movimentoTab, setMovimentoTab] = useState<"com" | "sem">("com");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");
  const [filterRecebimento, setFilterRecebimento] = useState<string>("todos");
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [dialogEmpresa, setDialogEmpresa] = useState<any>(null);
  const [rowTabs, setRowTabs] = useState<Record<string, 'dados' | 'pastas'>>({});
  const [latestParams, setLatestParams] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const { data } = await supabase.from('fiscal').select('empresa_id, observacoes').order('competencia', { ascending: false }).limit(2500);
        const map: any = {};
        data?.forEach(r => {
          if (!map[r.empresa_id]) map[r.empresa_id] = r.observacoes || {};
        });
        setLatestParams(map);
      } catch (err) { console.error("Error fetching latest params", err); }
    };
    fetchLatest();
  }, []);

  const recebimentoOptions = ["E-mail", "WhatsApp", "Drive", "Físico"];

  const filtered = React.useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
      let matchTab = false;
      const isOutra = e.situacao === "entregue";
      const record = fiscalData[e.id];

      if (activeTab === "simples") matchTab = !isOutra && (e.regime_tributario === "simples" || (e.regime_tributario !== "mei" && e.regime_tributario !== "simei" && e.regime_tributario !== "lucro_presumido" && e.regime_tributario !== "lucro_real" && e.porte_empresa !== "mei"));
      else if (activeTab === "lucro") matchTab = !isOutra && (e.regime_tributario === "lucro_presumido" || e.regime_tributario === "lucro_real");
      else if (activeTab === "mei") matchTab = !isOutra && (e.regime_tributario === "mei" || e.regime_tributario === "simei" || (e.porte_empresa === "mei" && e.regime_tributario !== "simples" && e.regime_tributario !== "lucro_presumido" && e.regime_tributario !== "lucro_real"));
      else if (activeTab === "outras") matchTab = false; // Tab removed

      // Filtro de Movimentação (apenas para Simples e Lucro)
      let matchMovimento = true;
      if (activeTab === "simples" || activeTab === "lucro") {
        const obs = record?.observacoes || latestParams[e.id] || {};
        const status = obs.movimento_status || "com_movimento";
        matchMovimento = movimentoTab === "com" ? status === "com_movimento" : status === "sem_movimento";
      }

      let matchStatus = true;
      if (filterStatus !== "todos") {
        const items = e.regime_tributario === 'simples' ? ['status_guia'] :
          (e.regime_tributario === 'lucro_presumido' || e.regime_tributario === 'lucro_real') ?
            ['irpj_csll_status', 'pis_cofins_status', 'icms_status', 'iss_status'] : [];
        if (items.length > 0) {
          const statuses = items.map(field => record?.[field as keyof FiscalRecord] || 'pendente');
          const isAllConcluido = statuses.every(s => s === 'enviada' || s === 'gerada' || s === 'PGDAS Zerado');
          matchStatus = filterStatus === 'concluido' ? isAllConcluido : !isAllConcluido;
        } else matchStatus = filterStatus === 'pendente';
      }

      let matchRecebimento = true;
      if (filterRecebimento !== "todos") {
        matchRecebimento = (record?.recebimento_arquivos?.trim() || "").toLowerCase() === filterRecebimento.toLowerCase();
      }

      return matchSearch && matchTab && matchStatus && matchRecebimento && matchMovimento;
    });
  }, [search, activeTab, movimentoTab, filterStatus, filterRecebimento, empresas, fiscalData]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = (fiscalData[id] || {}) as Partial<FiscalRecord>;
    let fixedFields: any = {
      tipo_nota: "",
      recebimento_arquivos: "",
      aliquota: null,
      ramo_empresarial: "",
      xml_status: "pendente",
      forma_envio: "",
      aliquota_irpj: null,
      aliquota_csll: null,
      aliquota_pis: null,
      aliquota_cofins: null,
      aliquota_icms: null,
      aliquota_iss: null,
      observacoes: {}
    };

    if (!existing.id) {
      const { data: prev } = await supabase.from("fiscal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        fixedFields = {
          tipo_nota: prev[0].tipo_nota || "",
          recebimento_arquivos: prev[0].recebimento_arquivos || "",
          aliquota: prev[0].aliquota,
          ramo_empresarial: prev[0].ramo_empresarial || "",
          xml_status: prev[0].xml_status || "pendente",
          forma_envio: prev[0].forma_envio || "",
          aliquota_irpj: prev[0].aliquota_irpj,
          aliquota_csll: prev[0].aliquota_csll,
          aliquota_pis: prev[0].aliquota_pis,
          aliquota_cofins: prev[0].aliquota_cofins,
          aliquota_icms: prev[0].aliquota_icms,
          aliquota_iss: prev[0].aliquota_iss,
          observacoes: prev[0].observacoes || {}
        };
      }
    } else {
      fixedFields = {
        tipo_nota: existing.tipo_nota || "",
        recebimento_arquivos: existing.recebimento_arquivos || "",
        aliquota: existing.aliquota,
        ramo_empresarial: existing.ramo_empresarial || "",
        xml_status: existing.xml_status || "pendente",
        forma_envio: existing.forma_envio || "",
        aliquota_irpj: existing.aliquota_irpj,
        aliquota_csll: existing.aliquota_csll,
        aliquota_pis: existing.aliquota_pis,
        aliquota_cofins: existing.aliquota_cofins,
        aliquota_icms: existing.aliquota_icms,
        aliquota_iss: existing.aliquota_iss,
        observacoes: existing.observacoes || {}
      };
    }

    setEditForm(prev => ({
      ...prev, [id]: {
        ...fixedFields,
        status_guia: existing.status_guia || "pendente",
        data_envio: existing.data_envio || "",
        irpj_csll_status: existing.irpj_csll_status || "pendente",
        irpj_csll_data_envio: existing.irpj_csll_data_envio || "",
        pis_cofins_status: existing.pis_cofins_status || "pendente",
        pis_cofins_data_envio: existing.pis_cofins_data_envio || "",
        icms_status: existing.icms_status || "pendente",
        icms_data_envio: existing.icms_data_envio || "",
        iss_status: existing.iss_status || "pendente",
        iss_data_envio: existing.iss_data_envio || "",
      }
    }));
  };

  const handleSaveAction = async (empresaId: string) => {
    const form = editForm[empresaId];
    try {
      await saveFiscalRecord({
        empresa_id: empresaId, competencia,
        tipo_nota: form.tipo_nota || null,
        recebimento_arquivos: form.recebimento_arquivos || null,
        forma_envio: form.forma_envio || null,
        aliquota: form.aliquota ? parseFloat(String(form.aliquota)) : null,
        status_guia: form.status_guia || "pendente",
        xml_status: form.xml_status || "pendente",
        data_envio: form.data_envio || null,
        irpj_csll_status: form.irpj_csll_status || "pendente", irpj_csll_data_envio: form.irpj_csll_data_envio || null,
        pis_cofins_status: form.pis_cofins_status || "pendente", pis_cofins_data_envio: form.pis_cofins_data_envio || null,
        icms_status: form.icms_status || "pendente", icms_data_envio: form.icms_data_envio || null,
        iss_status: form.iss_status || "pendente", iss_data_envio: form.iss_data_envio || null,
        aliquota_irpj: form.aliquota_irpj ? parseFloat(String(form.aliquota_irpj)) : null,
        aliquota_csll: form.aliquota_csll ? parseFloat(String(form.aliquota_csll)) : null,
        aliquota_pis: form.aliquota_pis ? parseFloat(String(form.aliquota_pis)) : null,
        aliquota_cofins: form.aliquota_cofins ? parseFloat(String(form.aliquota_cofins)) : null,
        aliquota_icms: form.aliquota_icms ? parseFloat(String(form.aliquota_icms)) : null,
        observacoes: form.observacoes || {},
        ramo_empresarial: form.ramo_empresarial || null,
      });
      toast.success("Dados salvos!"); setExpanded(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveParameters = async (empresaId: string, data: any) => {
    try {
      await saveFiscalRecord({ empresa_id: empresaId, competencia, ...data });
      setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], ...data } }));
      if (data.observacoes) {
        setLatestParams(prev => ({ ...prev, [empresaId]: data.observacoes }));
      }
      toast.success("Parâmetros atualizados!");
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const completedCount = React.useMemo(() => {
    return filtered.filter(e => {
      const r = fiscalData[e.id]; if (!r) return false;
      const okXml = r.xml_status === "ok" || r.xml_status === "enviada" || r.xml_status === "gerada";
      return (e.regime_tributario === "lucro_real" || e.regime_tributario === "lucro_presumido")
        ? (okXml && (r.irpj_csll_status === "enviada" || r.irpj_csll_status === "gerada" || (r.irpj_csll_status as any) === "PGDAS Zerado"))
        : (okXml && (r.status_guia === "enviada" || r.status_guia === "gerada" || (r.status_guia as any) === "PGDAS Zerado"));
    }).length;
  }, [filtered, fiscalData]);

  if (empresasLoading || (fiscalLoading && Object.keys(fiscalData).length === 0)) {
    return (<div className="space-y-6"><PageHeaderSkeleton /><TableSkeleton rows={8} /></div>);
  }

  return (
    <div className="animate-fade-in relative pb-10">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      <div className="space-y-10">
        {/* Header Estilo Societário */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div className="space-y-1 -mt-2">
            <div className="flex items-center gap-2">
              <h1 className="header-title">Departamento <span className="text-primary/90 font-black">Fiscal</span></h1>
              <FavoriteToggleButton moduleId="fiscal" />
            </div>
            <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm">Controle de XML, impostos e obrigações tributárias mensais.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsUploaderOpen(true)} className="flex items-center gap-2 px-4 h-9 bg-black/10 dark:bg-white/5 text-primary hover:bg-primary/5 rounded-xl transition-all font-black text-[11px] uppercase border border-border/10 shadow-sm active:scale-95">
              <FileUp size={14} /> <span>Processar Guias</span>
            </button>
            <div className="flex items-center gap-3 px-3 h-9 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl shadow-inner">
              <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="bg-transparent border-none focus:ring-0 text-[12px] font-bold outline-none h-full text-primary cursor-pointer w-24" />
            </div>
          </div>
        </div>

        {/* Stats & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl overflow-hidden h-10 shrink-0 p-0.5 shadow-inner">
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[8px] text-foreground font-black tracking-wider">Total</span>
                <span className="text-sm font-black">{filtered.length}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[8px] text-primary font-black tracking-wider">OK</span>
                <span className="text-sm font-black text-primary">{completedCount}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center">
                <span className="text-[10px] text-rose-600 font-bold tracking-wider">Alertas</span>
                <span className="text-sm font-black text-rose-600">{filtered.length - completedCount}</span>
              </div>
            </div>
            <div className="relative flex-1 md:w-[280px] group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
              <input type="text" placeholder="PROCURAR EMPRESA..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 h-10 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl outline-none text-[12px] font-black uppercase focus:ring-1 focus:ring-primary/20 transition-all placeholder:opacity-40 shadow-inner" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterRecebimento} onChange={e => setFilterRecebimento(e.target.value)} className="h-10 px-4 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[11px] font-black outline-none cursor-pointer text-foreground uppercase min-w-[150px] shadow-inner">
              <option value="todos">RECB: TODOS</option>
              {recebimentoOptions.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
            </select>
            <div className="flex bg-black/10 dark:bg-white/5 p-0.5 rounded-xl border border-border/10 shrink-0 h-10 items-center shadow-inner">
              {[{ id: "todos", label: "Geral" }, { id: "pendente", label: "Pendentes" }, { id: "concluido", label: "Enviados" }].map(s => (
                <button key={s.id} onClick={() => setFilterStatus(s.id as any)} className={`px-4 h-full rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterStatus === s.id ? "bg-card text-primary shadow-sm" : "text-foreground hover:text-foreground"}`}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Navegação por Abas Integradas - Alta Legibilidade */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-[1.5rem] border border-border/20 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Abas Principais */}
          <div className="flex p-1 gap-1 border-b border-border/10">
            {[
              { id: "simples", label: "Simples Nacional" },
              { id: "lucro", label: "Lucro Presumido/Real" },
              { id: "mei", label: "MEI / Simei" }
            ].map(t => (
              <button
                key={t.id}
                className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-lg scale-[1.01]" : "text-muted-foreground hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5"}`}
                onClick={() => setActiveTab(t.id as any)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sub-abas Conectadas (Apenas para Simples e Lucro) */}
          {(activeTab === "simples" || activeTab === "lucro") && (
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-black/20 flex items-center gap-8 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-zinc-800 rounded-xl border border-border/10 shadow-sm">
                <button
                  onClick={() => setMovimentoTab("com")}
                  className={`flex items-center gap-2 px-6 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${movimentoTab === "com" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-primary dark:hover:text-white"}`}
                >
                  <Activity size={12} className={movimentoTab === "com" ? "text-primary-foreground" : "opacity-30"} />
                  Com Movimento
                </button>
                <button
                  onClick={() => setMovimentoTab("sem")}
                  className={`flex items-center gap-2 px-6 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${movimentoTab === "sem" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-primary dark:hover:text-white"}`}
                >
                  <Trash2 size={12} className={movimentoTab === "sem" ? "text-primary-foreground" : "opacity-30"} />
                  Sem Movimento
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-black/[0.03] dark:bg-white/[0.02] border border-border/10 rounded-[2.5rem] shadow-inner p-1 pb-4 relative">
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_80px_1fr_1.2fr_60px] px-6 py-4 text-[10px] font-black uppercase text-muted-foreground/60 mb-0 relative z-20">
            <span>Empresa</span>
            <span>CNPJ</span>
            <span>Regime</span>
            <span className="text-center">XML</span>
            <span className="text-center">Guia</span>
            <span className="text-center">Data Envio</span>
            <span className="text-right pr-2">Ações</span>
          </div>

          <div className="space-y-3 px-1 relative z-10">
            {filtered.map(emp => {
              const isOpen = expanded === emp.id;
              const r = fiscalData[emp.id];
              const form = editForm[emp.id] || {};

              const okXml = form.xml_status === "ok";
              const rOkXml = r?.xml_status === "ok";
              const isLucro = emp.regime_tributario === "lucro_presumido" || emp.regime_tributario === "lucro_real";
              const checkDone = (status: any) => status === "gerada" || status === "PGDAS Zerado" || status === "enviada";

              const rIsConcluido = rOkXml && (
                isLucro
                  ? (checkDone(r?.irpj_csll_status) && checkDone(r?.pis_cofins_status) && checkDone(r?.icms_status))
                  : checkDone(r?.status_guia)
              ) && r?.observacoes?.envio_status === "enviado";

              // Custom Header for Fiscal Module
              const customHeader = (
                <div className="md:grid md:grid-cols-[2.2fr_1fr_1fr_80px_1fr_1.2fr_60px] items-center w-full py-1 gap-6">
                  {/* Empresa */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 border",
                      isOpen ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-black/5 dark:bg-white/5 border-border/10 group-hover:border-primary/20"
                    )}>
                      <Building2 size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "font-black text-[13px] uppercase tracking-tight truncate transition-colors",
                        isOpen ? "text-primary" : "text-foreground group-hover:text-primary"
                      )}>
                        {emp.nome_empresa}
                      </span>
                      <span className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest">
                        ID: {emp.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* CNPJ */}
                  <div className="hidden md:block text-[11px] font-black text-muted-foreground/60 font-mono tracking-tighter">
                    {emp.cnpj}
                  </div>

                  {/* Regime */}
                  <div className="hidden md:block">
                    <span className="px-3 py-1 bg-black/5 dark:bg-white/5 border border-border/5 rounded-lg text-[9px] font-black uppercase text-muted-foreground/70 tracking-tighter">
                      {regimeLabels[emp.regime_tributario] || "N/A"}
                    </span>
                  </div>

                  {/* XML */}
                  <div className="hidden md:flex justify-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-sm",
                      rOkXml ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {rOkXml ? "OK" : "PEND"}
                    </span>
                  </div>

                  {/* Guia/Fechamento */}
                  <div className="hidden md:flex justify-center">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm",
                      rIsConcluido ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {rIsConcluido ? "CONCLUÍDO" : "PENDENTE"}
                    </span>
                  </div>

                  {/* Data Envio */}
                  <div className="hidden md:block text-center text-[11px] font-black text-muted-foreground/40">
                    {r?.observacoes?.data_envio ? formatDateBR(r.observacoes.data_envio) : "—"}
                  </div>

                  {/* Ações */}
                  <div className="flex justify-end pr-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border",
                      isOpen ? "bg-primary text-primary-foreground border-primary shadow-lg rotate-180" : "bg-black/5 dark:bg-white/5 border-border/10 text-muted-foreground/80"
                    )}>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
              );

              return (
                <EmpresaAccordion
                  key={emp.id}
                  isOpen={isOpen}
                  onClick={() => toggleExpand(emp.id)}
                  customHeader={customHeader}
                  nome_empresa={emp.nome_empresa} // Fallback support
                  icon={<Building2 size={20} />} // Fallback support
                >
                  <div className="max-w-6xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Tabs value={rowTabs[emp.id] || 'dados'} onValueChange={(v) => setRowTabs(prev => ({ ...prev, [emp.id]: v as any }))} className="space-y-4">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-border/10 pb-3">
                        <TabsList className="bg-black/10 dark:bg-white/10 p-0.5 rounded-xl h-9 border border-border/10 shadow-inner">
                          <TabsTrigger value="dados" className="px-6 h-7 text-[11px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Painel Fiscal</TabsTrigger>
                          <TabsTrigger value="pastas" className="px-6 h-7 text-[11px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Pastas</TabsTrigger>
                        </TabsList>
                        <button onClick={() => setDialogEmpresa(emp)} className="h-8 px-4 text-[11px] font-black uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2 active:scale-95 shadow-sm"><Settings size={12} /> Parâmetros</button>
                      </div>

                      <TabsContent value="dados" className="space-y-4 outline-none">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {[
                            { l: 'Tipo de Nota', v: editForm[emp.id]?.tipo_nota, f: 'tipo_nota' },
                            { l: 'Recebimento', v: editForm[emp.id]?.recebimento_arquivos, f: 'recebimento_arquivos' },
                            { l: 'Forma de Envio', v: editForm[emp.id]?.forma_envio, f: 'forma_envio' },
                            { l: 'Ramo Empresarial', v: editForm[emp.id]?.ramo_empresarial, f: 'ramo_empresarial' }
                          ].map(x => (
                            <div key={x.l} className="bg-card p-3 rounded-xl border border-border/10 shadow-sm transition-all hover:border-primary/20 group/input">
                              <span className="block text-[10px] uppercase text-foreground font-black tracking-widest mb-1 group-focus-within/input:text-primary transition-colors">{x.l}</span>
                              <input
                                type="text"
                                value={x.v ?? ""}
                                onChange={e => updateForm(emp.id, x.f, e.target.value)}
                                className="w-full bg-transparent text-[12px] font-bold uppercase outline-none text-foreground placeholder-muted-foreground/20"
                                placeholder="NÃO DEFINIDO"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="bg-card p-4 rounded-2xl border border-border/10 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-border/5 pb-3">
                            <h4 className="text-[12px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                              <Activity className="text-primary" size={14} />
                              Controle Mensal
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">XML</label>
                              <select value={editForm[emp.id]?.xml_status || "pendente"} onChange={e => updateForm(emp.id, "xml_status", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer shadow-inner">
                                <option value="pendente">PENDENTE</option>
                                <option value="ok">OK</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Guia Mensal</label>
                              <select value={editForm[emp.id]?.status_guia || "pendente"} onChange={e => updateForm(emp.id, "status_guia", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer shadow-inner">
                                <option value="pendente">PENDENTE</option>
                                <option value="gerada">GERADA</option>
                                <option value="PGDAS Zerado">ZERADO/S.M.</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Data Transmissão</label>
                              <input type="date" value={editForm[emp.id]?.data_envio || ""} onChange={e => updateForm(emp.id, "data_envio", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black focus:ring-1 focus:ring-primary/20 outline-none uppercase shadow-inner" />
                            </div>

                            <div className="space-y-3 md:col-span-3 pt-2 border-t border-border/5">
                              <div className="flex items-center justify-between">
                                <h5 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-1.5">
                                  <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Detalhamento de Alíquotas</label>
                                </h5>
                                <button
                                  onClick={() => {
                                    const currentAliquotas = editForm[emp.id]?.observacoes?.aliquotas_detalhadas || [];
                                    updateForm(emp.id, "observacoes", {
                                      ...editForm[emp.id]?.observacoes,
                                      aliquotas_detalhadas: [...currentAliquotas, { descricao: "", valor: 0 }]
                                    });
                                  }}
                                  className="px-2 py-1 bg-primary/5 hover:bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 active:scale-95 border border-primary/10"
                                >
                                  <Plus size={10} /> Add Alíquota
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(editForm[emp.id]?.observacoes?.aliquotas_detalhadas || []).map((alq: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-200">
                                    <input
                                      type="text"
                                      placeholder="DESCRIÇÃO DA ALÍQUOTA"
                                      value={alq.descricao}
                                      onChange={e => {
                                        const newAlqs = [...editForm[emp.id].observacoes.aliquotas_detalhadas];
                                        newAlqs[idx].descricao = e.target.value;
                                        updateForm(emp.id, "observacoes", { ...editForm[emp.id].observacoes, aliquotas_detalhadas: newAlqs });
                                      }}
                                      className="flex-1 h-10 px-4 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[12px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner"
                                    />
                                    <div className="relative flex-[2]">
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={alq.valor}
                                        onChange={e => {
                                          const newAlqs = [...editForm[emp.id].observacoes.aliquotas_detalhadas];
                                          newAlqs[idx].valor = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                          updateForm(emp.id, "observacoes", { ...editForm[emp.id].observacoes, aliquotas_detalhadas: newAlqs });
                                        }}
                                        className="w-full h-10 px-4 pr-8 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[13px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner text-right font-mono text-foreground"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-primary">%</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const newAlqs = editForm[emp.id].observacoes.aliquotas_detalhadas.filter((_: any, i: number) => i !== idx);
                                        updateForm(emp.id, "observacoes", { ...editForm[emp.id].observacoes, aliquotas_detalhadas: newAlqs });
                                      }}
                                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/5 hover:bg-rose-500 text-rose-500/30 hover:text-white transition-all active:scale-95 shadow-sm"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                                {(!editForm[emp.id]?.observacoes?.aliquotas_detalhadas || editForm[emp.id]?.observacoes?.aliquotas_detalhadas.length === 0) && (
                                  <div className="py-4 text-center border border-dashed border-border/10 rounded-xl">
                                    <p className="text-[8px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Nenhuma alíquota detalhada</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {emp.regime_tributario !== 'simples' && (
                              <div className="md:col-span-3 mt-1 space-y-3 pt-3 border-t border-border/5">
                                <div className="flex flex-wrap items-end gap-2.5 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-border/5 shadow-inner">
                                  <div className="w-40 space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">IRPJ / CSLL</label>
                                    <select value={editForm[emp.id]?.irpj_csll_status || "pendente"} onChange={e => updateForm(emp.id, "irpj_csll_status", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                      <option value="pendente">PENDENTE</option>
                                      <option value="gerada">GERADO</option>
                                      <option value="PGDAS Zerado">ZERADO</option>
                                    </select>
                                  </div>
                                  <div className="flex-1 min-w-[60px] space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">ALQ. IRPJ</label>
                                    <input type="number" step="0.01" value={editForm[emp.id]?.aliquota_irpj ?? ""} onChange={e => updateForm(emp.id, "aliquota_irpj", e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[12px] font-bold outline-none focus:ring-1 focus:ring-primary/20" placeholder="0,00" />
                                  </div>
                                  <div className="flex-1 min-w-[60px] space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">ALQ. CSLL</label>
                                    <input type="number" step="0.01" value={editForm[emp.id]?.aliquota_csll ?? ""} onChange={e => updateForm(emp.id, "aliquota_csll", e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[12px] font-bold outline-none focus:ring-1 focus:ring-primary/20" placeholder="0,00" />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-end gap-2.5 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-border/5 shadow-inner">
                                  <div className="w-40 space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">PIS / COFINS</label>
                                    <select value={editForm[emp.id]?.pis_cofins_status || "pendente"} onChange={e => updateForm(emp.id, "pis_cofins_status", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                      <option value="pendente">PENDENTE</option>
                                      <option value="gerada">GERADO</option>
                                      <option value="PGDAS Zerado">ZERADO</option>
                                    </select>
                                  </div>
                                  <div className="flex-1 min-w-[60px] space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">ALQ. PIS</label>
                                    <input type="number" step="0.01" value={editForm[emp.id]?.aliquota_pis ?? ""} onChange={e => updateForm(emp.id, "aliquota_pis", e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[12px] font-bold outline-none focus:ring-1 focus:ring-primary/20" placeholder="0,00" />
                                  </div>
                                  <div className="flex-1 min-w-[60px] space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">ALQ. COFINS</label>
                                    <input type="number" step="0.01" value={editForm[emp.id]?.aliquota_cofins ?? ""} onChange={e => updateForm(emp.id, "aliquota_cofins", e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[12px] font-bold outline-none focus:ring-1 focus:ring-primary/20" placeholder="0,00" />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-end gap-2.5 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-border/5 shadow-inner">
                                  <div className="w-40 space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">ICMS</label>
                                    <select value={editForm[emp.id]?.icms_status || "pendente"} onChange={e => updateForm(emp.id, "icms_status", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                      <option value="pendente">PENDENTE</option>
                                      <option value="gerada">GERADO</option>
                                      <option value="PGDAS Zerado">ZERADO</option>
                                    </select>
                                  </div>
                                  <div className="flex-1 min-w-[60px] space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">ALQ. ICMS</label>
                                    <input type="number" step="0.01" value={editForm[emp.id]?.aliquota_icms ?? ""} onChange={e => updateForm(emp.id, "aliquota_icms", e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[12px] font-bold outline-none focus:ring-1 focus:ring-primary/20" placeholder="0,00" />
                                  </div>
                                  <div className="w-40 space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">ISS</label>
                                    <select value={editForm[emp.id]?.iss_status || "pendente"} onChange={e => updateForm(emp.id, "iss_status", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                      <option value="pendente">PENDENTE</option>
                                      <option value="gerada">GERADO</option>
                                      <option value="PGDAS Zerado">ZERADO</option>
                                    </select>
                                  </div>
                                  <div className="flex-1 min-w-[60px] space-y-1">
                                    <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-0.5">ALQ. ISS</label>
                                    <input type="number" step="0.01" value={editForm[emp.id]?.aliquota_iss ?? ""} onChange={e => updateForm(emp.id, "aliquota_iss", e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-8 px-2 rounded-lg border border-border/10 bg-card text-[12px] font-bold outline-none focus:ring-1 focus:ring-primary/20" placeholder="0,00" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Controle de Envio Dinâmico */}
                          <div className="pt-2 border-t border-border/5 flex flex-col md:flex-row items-end justify-between gap-4">
                            <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Envio para o Cliente</label>
                                <select
                                  value={editForm[emp.id]?.observacoes?.envio_status || "pendente"}
                                  onChange={e => updateForm(emp.id, "observacoes", { ...editForm[emp.id]?.observacoes, envio_status: e.target.value })}
                                  className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner"
                                >
                                  <option value="pendente">Pendente</option>
                                  <option value="enviado">Enviado</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Data de envio</label>
                                <input type="date" value={editForm[emp.id]?.observacoes?.envio_data || ""} onChange={e => updateForm(emp.id, "observacoes", { ...editForm[emp.id]?.observacoes, envio_data: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black focus:ring-1 focus:ring-primary/20 outline-none uppercase shadow-inner" />
                              </div>
                            </div>
                            <button onClick={() => handleSaveAction(emp.id)} className="h-9 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 group">
                              <Save size={14} className="group-hover:scale-110 transition-transform" />
                              <span className="text-[11px] font-black uppercase tracking-widest">Gravar Fechamento</span>
                            </button>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="pastas" className="animate-in slide-in-from-right-1 duration-200 outline-none">
                        <div className="bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-border/10 p-0.5 overflow-hidden shadow-inner">
                          <ModuleFolderView empresa={emp} departamentoId="fiscal" />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </EmpresaAccordion>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 bg-black/[0.02] dark:bg-white/[0.01] rounded-xl border border-dashed border-border/10">
                <Search size={24} className="text-muted-foreground mb-2" />
                <p className="text-[12px] font-black text-foreground uppercase tracking-widest">Nenhuma empresa encontrada no filtro</p>
              </div>
            )}
          </div>

          {isUploaderOpen && <TaxGuideUploader empresas={empresas} onClose={() => setIsUploaderOpen(false)} onConfirm={() => queryClient.invalidateQueries({ queryKey: ["fiscal"] })} competenciaFiltro={competencia} />}
          {dialogEmpresa && <FiscalParametersDialog isOpen={!!dialogEmpresa} empresa={dialogEmpresa} initialData={editForm[dialogEmpresa.id] || {}} onClose={() => setDialogEmpresa(null)} onSave={(data) => handleSaveParameters(dialogEmpresa.id, data)} />}
        </div>
      </div>
    </div>
  );
};

export default FiscalPage;
