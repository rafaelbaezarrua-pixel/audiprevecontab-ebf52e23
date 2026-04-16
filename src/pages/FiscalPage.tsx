import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, Save, Building2, FileUp, Settings, Activity } from "lucide-react";
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

const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI", simei: "Simei" };

const FiscalPage: React.FC = () => {
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const { empresas, loading: empresasLoading } = useEmpresas("fiscal");
  const { fiscalData, loading: fiscalLoading, saveFiscalRecord } = useFiscal(competencia);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"simples" | "lucro" | "mei" | "outras">("simples");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");
  const [filterRecebimento, setFilterRecebimento] = useState<string>("todos");
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [dialogEmpresa, setDialogEmpresa] = useState<any>(null);
  const [rowTabs, setRowTabs] = useState<Record<string, 'dados' | 'pastas'>>({});

  const recebimentoOptions = ["E-mail", "WhatsApp", "Drive", "Físico"];

  const filtered = React.useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
      let matchTab = false;
      const isOutra = e.situacao === "paralisada" || e.situacao === "baixada" || e.situacao === "entregue";

      if (activeTab === "simples") matchTab = !isOutra && e.regime_tributario === "simples" && e.porte_empresa !== "mei";
      else if (activeTab === "lucro") matchTab = !isOutra && (e.regime_tributario === "lucro_presumido" || e.regime_tributario === "lucro_real");
      else if (activeTab === "mei") matchTab = !isOutra && (e.regime_tributario === "mei" || e.regime_tributario === "simei" || e.porte_empresa === "mei" || e.situacao === "mei");
      else if (activeTab === "outras") matchTab = isOutra;

      let matchStatus = true;
      if (filterStatus !== "todos") {
        const record = fiscalData[e.id];
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
        const record = fiscalData[e.id];
        matchRecebimento = (record?.recebimento_arquivos?.trim() || "").toLowerCase() === filterRecebimento.toLowerCase();
      }

      return matchSearch && matchTab && matchStatus && matchRecebimento;
    });
  }, [search, activeTab, filterStatus, filterRecebimento, empresas, fiscalData]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = (fiscalData[id] || {}) as Partial<FiscalRecord>;
    let fixedFields = { tipo_nota: "", recebimento_arquivos: "", aliquota: null as number | null, ramo_empresarial: "", xml_status: "pendente" as any };

    if (!existing.id) {
      const { data: prev } = await supabase.from("fiscal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        fixedFields = { tipo_nota: prev[0].tipo_nota || "", recebimento_arquivos: prev[0].recebimento_arquivos || "", aliquota: prev[0].aliquota, ramo_empresarial: prev[0].ramo_empresarial || "", xml_status: prev[0].xml_status || "pendente" };
      }
    } else {
      fixedFields = { tipo_nota: existing.tipo_nota || "", recebimento_arquivos: existing.recebimento_arquivos || "", aliquota: existing.aliquota, ramo_empresarial: existing.ramo_empresarial || "", xml_status: existing.xml_status || "pendente" };
    }

    setEditForm(prev => ({
      ...prev, [id]: {
        ...fixedFields, forma_envio: existing.forma_envio || "",
        status_guia: existing.status_guia || "pendente", data_envio: existing.data_envio || "",
        observacoes: existing.observacoes || {},
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
        observacoes: form.observacoes || {},
        ramo_empresarial: form.ramo_empresarial || null,
      });
      toast.success("Dados salvos!"); setExpanded(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveParameters = async (empresaId: string, data: any) => {
    try {
      await saveFiscalRecord({ empresa_id: empresaId, competencia, ...data });
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
    <div className="space-y-6 animate-fade-in relative pb-10 px-1">
      {/* Header Estilo Societário */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Gestão <span className="text-primary/90">Fiscal</span></h1>
            <FavoriteToggleButton moduleId="fiscal" />
          </div>
          <p className="subtitle-premium">Controle de XML, impostos e obrigações tributárias mensais.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setIsUploaderOpen(true)} className="flex items-center gap-2.5 px-6 h-12 bg-black/5 dark:bg-white/5 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-border/10">
            <FileUp size={18} /> <span>Processar Guias</span>
          </button>
          <div className="flex items-center gap-4 px-5 h-12 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl">
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Comp.</span>
            <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="bg-transparent border-none focus:ring-0 text-[11px] font-black outline-none text-right h-full text-foreground uppercase cursor-pointer w-28" />
          </div>
        </div>
      </div>

      {/* Stats & Search Bar - Estilo Societário */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl overflow-hidden h-14 shrink-0 p-1">
            <div className="px-5 py-2 flex flex-col justify-center border-r border-border/5">
              <span className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-wider mb-1">Empresas</span>
              <span className="text-xl font-black">{filtered.length}</span>
            </div>
            <div className="px-5 py-2 flex flex-col justify-center border-r border-border/5">
              <span className="text-[8px] text-primary/40 font-black uppercase tracking-wider mb-1">OK</span>
              <span className="text-xl font-black text-primary">{completedCount}</span>
            </div>
            <div className="px-5 py-2 flex flex-col justify-center">
              <span className="text-[8px] text-rose-500/40 font-black uppercase tracking-wider mb-1">Alertas</span>
              <span className="text-xl font-black text-rose-500">{filtered.length - completedCount}</span>
            </div>
          </div>
          <div className="relative flex-1 md:w-[320px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={18} />
            <input type="text" placeholder="BUSCAR POR NOME OU CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 h-14 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl outline-none text-[11px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/20" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={filterRecebimento} onChange={e => setFilterRecebimento(e.target.value)} className="h-14 px-6 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-black outline-none cursor-pointer text-foreground uppercase tracking-widest min-w-[180px]">
            <option value="todos">RECEBIMENTO: TODOS</option>
            {recebimentoOptions.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
          </select>
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-border/10 shrink-0 h-14 items-center">
            {[{ id: "todos", label: "Geral" }, { id: "pendente", label: "Pendentes" }, { id: "concluido", label: "Enviados" }].map(s => (
              <button key={s.id} onClick={() => setFilterStatus(s.id as any)} className={`px-6 h-full rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterStatus === s.id ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground"}`}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Navegação por Abas - Estilo Societário */}
      <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-xl border border-border/10 overflow-x-auto no-scrollbar gap-1 w-full">
        {[{ id: "simples", label: "Simples Nacional" }, { id: "lucro", label: "Lucro Presumido/Real" }, { id: "mei", label: "MEI / Simei" }, { id: "outras", label: "Paralisadas/Baixadas" }].map(t => (
          <button key={t.id} className={`px-10 py-3.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === t.id ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground hover:bg-card/30"}`} onClick={() => setActiveTab(t.id as any)}>{t.label}</button>
        ))}
      </div>

      {/* Tabela de Dados - Estilo Societário Compacto */}
      <div className="glass-card !p-0 overflow-hidden border-border/10 shadow-none rounded-xl">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-border/10">
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 min-w-[240px]">Empresas</th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">CNPJ</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">XML</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Guia</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Transmissão</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 pr-8">Opções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {filtered.map(emp => {
                const isOpen = expanded === emp.id;
                const r = fiscalData[emp.id];
                const okXml = r?.xml_status === "ok" || r?.xml_status === "enviada" || r?.xml_status === "gerada";
                const done = (emp.regime_tributario === "lucro_real" || emp.regime_tributario === "lucro_presumido")
                  ? (okXml && (r?.irpj_csll_status === "enviada" || r?.irpj_csll_status === "gerada" || (r?.irpj_csll_status as any) === "PGDAS Zerado"))
                  : (okXml && (r?.status_guia === "enviada" || r?.status_guia === "gerada" || (r?.status_guia as any) === "PGDAS Zerado"));

                return (
                  <React.Fragment key={emp.id}>
                    <tr onClick={() => toggleExpand(emp.id)} className={`group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all ${isOpen ? 'bg-primary/[0.04]' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground shrink-0 border border-border/5"><Building2 size={22} className="transition-all" /></div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-foreground text-sm uppercase tracking-tight truncate max-w-[280px] leading-none group-hover:text-primary transition-colors">{emp.nome_empresa}</span>
                            <span className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest mt-1.5 opacity-60">Regime: {regimeLabels[emp.regime_tributario] || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="text-muted-foreground/60 font-mono text-[10px] tracking-wider">{emp.cnpj || "—"}</span></td>
                      <td className="px-6 py-4 text-center whitespace-nowrap"><div className={`inline-block w-3 h-3 rounded-full ${okXml ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`} /></td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${done ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                          {r?.status_guia === "enviada" || r?.status_guia === "gerada" ? 'ENVIADA' : (r?.status_guia === "PGDAS Zerado" ? "PGDAS ZERADO" : "PENDENTE")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap"><span className="text-muted-foreground/40 font-black text-[10px] uppercase tracking-widest">{r?.data_envio ? formatDateBR(r.data_envio) : "—"}</span></td>
                      <td className="px-6 py-4 pr-8 text-right"><button className={`p-2 rounded-xl border transition-all ${isOpen ? 'bg-primary text-white border-primary rotate-180 shadow-lg' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/40 border-border/10 group-hover:border-primary/50 group-hover:text-primary'}`}><ChevronDown size={14} /></button></td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="px-3 py-4">
                          <div className="bg-card border border-border/50 shadow-inner rounded-2xl p-6 mx-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="max-w-5xl mx-auto space-y-6">
                              <Tabs value={rowTabs[emp.id] || 'dados'} onValueChange={(v) => setRowTabs(prev => ({ ...prev, [emp.id]: v as any }))} className="space-y-6">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border/10 pb-6">
                                  <TabsList className="bg-black/5 dark:bg-white/5 p-1 rounded-xl h-12 border border-border/10">
                                    <TabsTrigger value="dados" className="px-8 h-full text-[9px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Dados</TabsTrigger>
                                    <TabsTrigger value="pastas" className="px-8 h-full text-[9px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Documentos</TabsTrigger>
                                  </TabsList>
                                  <button onClick={() => setDialogEmpresa(emp)} className="h-10 px-5 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-3"><Settings size={16} /> Ajustar Parâmetros</button>
                                </div>

                                <TabsContent value="dados" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                      { l: 'Tipo de Nota', v: editForm[emp.id]?.tipo_nota, f: 'tipo_nota' },
                                      { l: 'Recebimento', v: editForm[emp.id]?.recebimento_arquivos, f: 'recebimento_arquivos' },
                                      { l: 'Forma de Envio', v: editForm[emp.id]?.forma_envio, f: 'forma_envio' },
                                      { l: 'Ramo Empresarial', v: editForm[emp.id]?.ramo_empresarial, f: 'ramo_empresarial' }
                                    ].map(x => (
                                      <div key={x.l} className="bg-white dark:bg-black/10 p-5 rounded-2xl border border-border/10 shadow-sm transition-all hover:border-primary/20">
                                        <span className="block text-[8px] uppercase text-muted-foreground/40 font-black tracking-widest mb-3">{x.l}</span>
                                        <input
                                          type="text"
                                          value={x.v ?? ""}
                                          onChange={e => updateForm(emp.id, x.f, e.target.value)}
                                          className="w-full bg-transparent text-[11px] font-black uppercase outline-none focus:text-primary transition-colors text-foreground"
                                          placeholder="—"
                                        />
                                      </div>
                                    ))}
                                  </div>

                                  <div className="bg-white dark:bg-black/10 p-8 rounded-3xl border border-border/10 shadow-sm space-y-8">
                                    <div className="flex items-center justify-between border-b border-border/5 pb-5">
                                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight flex items-center gap-3"><Activity className="text-primary" size={20} /> Fechamento</h4>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${okXml ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-amber-500 shadow-lg shadow-amber-500/20"}`} />
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Fluxo {okXml ? "Liberado" : "Aguardando XML"}</span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">XML Status</label>
                                        <select value={editForm[emp.id]?.xml_status || "pendente"} onChange={e => updateForm(emp.id, "xml_status", e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/[0.02] dark:bg-white/[0.02] text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                          <option value="pendente">PENDENTE</option>
                                          <option value="ok">PROCESSADO</option>
                                        </select>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Guia / Imposto</label>
                                        <select value={editForm[emp.id]?.status_guia || "pendente"} onChange={e => updateForm(emp.id, "status_guia", e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/[0.02] dark:bg-white/[0.02] text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                          <option value="pendente">PENDENTE</option>
                                          <option value="gerada">GUIA GERADA</option>
                                          <option value="enviada">ENVIADO</option>
                                          <option value="PGDAS Zerado">PGDAS ZERADO/S.M</option>
                                        </select>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Alíquota (%)</label>
                                        <input type="number" step="0.01" value={editForm[emp.id]?.aliquota ?? ""} onChange={e => updateForm(emp.id, "aliquota", e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-black focus:ring-1 focus:ring-primary/20 outline-none" placeholder="0,00" />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Transmissão</label>
                                        <input type="date" value={editForm[emp.id]?.data_envio || ""} onChange={e => updateForm(emp.id, "data_envio", e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-black focus:ring-1 focus:ring-primary/20 outline-none uppercase" />
                                      </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                      <button onClick={() => handleSaveAction(emp.id)} className="h-14 px-12 bg-[#4c7045] hover:bg-[#3d5a37] text-white rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-emerald-900/10 group">
                                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Salvar Fechamento Fiscal</span>
                                      </button>
                                    </div>
                                  </div>
                                </TabsContent>

                                <TabsContent value="pastas" className="animate-in slide-in-from-right-4 duration-300 outline-none">
                                  <ModuleFolderView empresa={emp} departamentoId="fiscal" />
                                </TabsContent>
                              </Tabs>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isUploaderOpen && <TaxGuideUploader empresas={empresas} onClose={() => setIsUploaderOpen(false)} onConfirm={() => queryClient.invalidateQueries({ queryKey: ["fiscal"] })} competenciaFiltro={competencia} />}
      {dialogEmpresa && <FiscalParametersDialog isOpen={!!dialogEmpresa} empresa={dialogEmpresa} initialData={editForm[dialogEmpresa.id] || {}} onClose={() => setDialogEmpresa(null)} onSave={(data) => handleSaveParameters(dialogEmpresa.id, data)} />}
    </div>
  );
};

export default FiscalPage;
