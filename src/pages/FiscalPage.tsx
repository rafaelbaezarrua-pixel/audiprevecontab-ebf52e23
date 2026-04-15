import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle, Building2, FileUp, Settings } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useFiscal } from "@/hooks/useFiscal";
import { FiscalRecord, GuiaStatus } from "@/types/fiscal";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { TaxGuideUploader, ProcessingResult } from "@/components/TaxGuideUploader";
import { FiscalParametersDialog } from "@/components/FiscalParametersDialog";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI", simei: "Simei" };

const situacaoConfig: Record<string, { label: string; cls: string }> = {
  ativa: { label: "Ativa", cls: "badge-success" },
  paralisada: { label: "Paralisada", cls: "badge-warning" },
  baixada: { label: "Baixada", cls: "badge-danger" },
  mei: { label: "MEI", cls: "badge-success" },
};

const FiscalPage: React.FC = () => {
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const { empresas, loading: empresasLoading, isFetching: empresasFetching } = useEmpresas("fiscal");
  const { fiscalData, loading: fiscalLoading, isFetching: fiscalFetching, saveFiscalRecord } = useFiscal(competencia);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"simples" | "lucro" | "mei" | "outras">("simples");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");
  const [filterRecebimento, setFilterRecebimento] = useState<string>("todos");
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [dialogEmpresa, setDialogEmpresa] = useState<any>(null);
  const [rowTabs, setRowTabs] = useState<Record<string, 'dados' | 'pastas'>>({});

  const filtered = React.useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
      let matchTab = false;
      const isOutra = e.situacao === "paralisada" || e.situacao === "baixada" || e.situacao === "entregue";

      if (activeTab === "simples") {
        matchTab = !isOutra && e.regime_tributario === "simples" && e.porte_empresa !== "mei";
      } else if (activeTab === "lucro") {
        matchTab = !isOutra && (e.regime_tributario === "lucro_presumido" || e.regime_tributario === "lucro_real");
      } else if (activeTab === "mei") {
        matchTab = !isOutra && (e.regime_tributario === "mei" || e.regime_tributario === "simei" || e.porte_empresa === "mei" || e.situacao === "mei");
      } else if (activeTab === "outras") {
        matchTab = isOutra;
      }

      let matchStatus = true;
      if (filterStatus !== "todos") {
        const record = fiscalData[e.id];
        const items = e.regime_tributario === 'simples' ? ['status_guia'] :
          e.regime_tributario === 'lucro_presumido' || e.regime_tributario === 'lucro_real' ?
            ['irpj_csll_status', 'pis_cofins_status', 'icms_status', 'iss_status'] : [];
        if (items.length > 0) {
          const statuses = items.map(field => record?.[field as keyof FiscalRecord] || 'pendente');
          const isAllConcluido = statuses.every(s => s === 'enviada' || s === 'gerada' || s === 'isento');
          matchStatus = filterStatus === 'concluido' ? isAllConcluido : !isAllConcluido;
        } else matchStatus = filterStatus === 'pendente';
      }

      let matchRecebimento = true;
      if (filterRecebimento !== "todos") {
        const record = fiscalData[e.id];
        const recFormatado = record?.recebimento_arquivos?.trim() || "";
        matchRecebimento = recFormatado.toLowerCase() === filterRecebimento.toLowerCase();
      }

      return matchSearch && matchTab && matchStatus && matchRecebimento;
    });
  }, [empresas, fiscalData, search, activeTab, filterStatus, filterRecebimento]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = (fiscalData[id] || {}) as Partial<FiscalRecord>;
    let fixedFields = { tipo_nota: "", recebimento_arquivos: "", aliquota: null as number | null, ramo_empresarial: "", xml_status: "pendente" as any, aliquota_irpj: null as number | null, aliquota_csll: null as number | null, aliquota_pis: null as number | null, aliquota_cofins: null as number | null, aliquota_icms: null as number | null, aliquota_iss: null as number | null, aliquota_cbs: null as number | null, aliquota_ibs: null as number | null };

    if (!existing.id) {
      const { data: prev } = await supabase.from("fiscal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        fixedFields = { tipo_nota: prev[0].tipo_nota || "", recebimento_arquivos: prev[0].recebimento_arquivos || "", aliquota: prev[0].aliquota, ramo_empresarial: prev[0].ramo_empresarial || "", xml_status: prev[0].xml_status || "pendente", aliquota_irpj: prev[0].aliquota_irpj, aliquota_csll: prev[0].aliquota_csll, aliquota_pis: prev[0].aliquota_pis, aliquota_cofins: prev[0].aliquota_cofins, aliquota_icms: prev[0].aliquota_icms, aliquota_iss: prev[0].aliquota_iss, aliquota_cbs: prev[0].aliquota_cbs, aliquota_ibs: prev[0].aliquota_ibs };
      }
    } else {
      fixedFields = { tipo_nota: existing.tipo_nota || "", recebimento_arquivos: existing.recebimento_arquivos || "", aliquota: existing.aliquota, ramo_empresarial: existing.ramo_empresarial || "", xml_status: existing.xml_status || "pendente", aliquota_irpj: existing.aliquota_irpj, aliquota_csll: existing.aliquota_csll, aliquota_pis: existing.aliquota_pis, aliquota_cofins: existing.aliquota_cofins, aliquota_icms: existing.aliquota_icms, aliquota_iss: existing.aliquota_iss, aliquota_cbs: existing.aliquota_cbs, aliquota_ibs: existing.aliquota_ibs };
    }

    setEditForm(prev => ({
      ...prev, [id]: {
        ...fixedFields, forma_envio: existing.forma_envio || "",
        status_guia: existing.status_guia || "pendente", data_envio: existing.data_envio || "",
        irpj_csll_status: existing.irpj_csll_status || "pendente", irpj_csll_data_envio: existing.irpj_csll_data_envio || "",
        pis_cofins_status: existing.pis_cofins_status || "pendente", pis_cofins_data_envio: existing.pis_cofins_data_envio || "",
        icms_status: existing.icms_status || "pendente", icms_data_envio: existing.icms_data_envio || "",
        iss_status: existing.iss_status || "pendente", iss_data_envio: existing.iss_data_envio || "",
        cbs_status: existing.cbs_status || "pendente", cbs_data_envio: existing.cbs_data_envio || "",
        ibs_status: existing.ibs_status || "pendente", ibs_data_envio: existing.ibs_data_envio || "",
        observacoes: existing.observacoes || {},
      }
    }));
  };

  const handleSaveAction = async (empresaId: string) => {
    const form = editForm[empresaId];
    try {
      const payload = {
        empresa_id: empresaId, competencia, tipo_nota: form.tipo_nota || null, recebimento_arquivos: form.recebimento_arquivos || null, forma_envio: form.forma_envio || null, aliquota: form.aliquota ? parseFloat(String(form.aliquota)) : null, status_guia: form.status_guia || "pendente", xml_status: form.xml_status || "pendente", data_envio: form.data_envio || null, observacoes: form.observacoes || {}, ramo_empresarial: form.ramo_empresarial || null,
        aliquota_irpj: form.aliquota_irpj ? parseFloat(String(form.aliquota_irpj)) : null, aliquota_csll: form.aliquota_csll ? parseFloat(String(form.aliquota_csll)) : null, irpj_csll_status: form.irpj_csll_status || "pendente", irpj_csll_data_envio: form.irpj_csll_data_envio || null,
        aliquota_pis: form.aliquota_pis ? parseFloat(String(form.aliquota_pis)) : null, aliquota_cofins: form.aliquota_cofins ? parseFloat(String(form.aliquota_cofins)) : null, pis_cofins_status: form.pis_cofins_status || "pendente", pis_cofins_data_envio: form.pis_cofins_data_envio || null,
        aliquota_icms: form.aliquota_icms ? parseFloat(String(form.aliquota_icms)) : null, icms_status: form.icms_status || "pendente", icms_data_envio: form.icms_data_envio || null,
        aliquota_iss: form.aliquota_iss ? parseFloat(String(form.aliquota_iss)) : null, iss_status: form.iss_status || "pendente", iss_data_envio: form.iss_data_envio || null,
        aliquota_cbs: form.aliquota_cbs ? parseFloat(String(form.aliquota_cbs)) : null, cbs_status: form.cbs_status || "pendente", cbs_data_envio: form.cbs_data_envio || null,
        aliquota_ibs: form.aliquota_ibs ? parseFloat(String(form.aliquota_ibs)) : null, ibs_status: form.ibs_status || "pendente", ibs_data_envio: form.ibs_data_envio || null,
      };
      await saveFiscalRecord(payload);
      toast.success("Dados salvos!");
      setExpanded(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const handleBulkConfirm = async (guides: ProcessingResult[]) => {
    for (const guide of guides) {
      if (!guide.data || !guide.empresa) continue;

      // Detect guide type and field
      const guideType = guide.data.tipo;
      let fieldPrefix = "";

      if (guideType?.includes("Simples")) fieldPrefix = ""; // status_guia
      else if (guideType?.includes("INSS")) fieldPrefix = "irpj_csll_"; // Heuristic
      else if (guideType?.includes("IRPJ")) fieldPrefix = "irpj_csll_";
      else if (guideType?.includes("ISS")) fieldPrefix = "iss_";

      const payload: any = {
        empresa_id: guide.empresa.id,
        competencia: competencia, // Use current page competencia
      };

      if (fieldPrefix === "") {
        payload.status_guia = "enviada";
        payload.data_envio = new Date().toISOString().split('T')[0];
      } else {
        payload[`${fieldPrefix}status`] = "enviada";
        payload[`${fieldPrefix}data_envio`] = new Date().toISOString().split('T')[0];
      }

      try {
        await saveFiscalRecord(payload);
      } catch (e) {
        console.error(`Failed to save guide for ${guide.empresa.nome_empresa}`, e);
      }
    }
  };

  const handleSaveParameters = async (params: Partial<FiscalRecord>) => {
    if (!dialogEmpresa) return;
    try {
      const payload = {
        ...params,
        empresa_id: dialogEmpresa.id,
        competencia
      };
      await saveFiscalRecord(payload);
      toast.success("Parâmetros atualizados!");

      if (expanded === dialogEmpresa.id) {
        setEditForm(prev => ({
          ...prev,
          [dialogEmpresa.id]: {
            ...prev[dialogEmpresa.id],
            ...params
          }
        }));
      }
      setDialogEmpresa(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const recebimentoOptions = React.useMemo(() => {
    const options = new Set<string>();
    // Default options that always appear
    options.add("EMAIL");
    options.add("FLY NOTAS");

    Object.values(fiscalData).forEach(r => {
      if (r?.recebimento_arquivos && r.recebimento_arquivos.trim() !== "") {
        options.add(r.recebimento_arquivos.trim().toUpperCase());
      }
    });
    return Array.from(options).sort();
  }, [fiscalData]);

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const completedCount = filtered.filter(e => {
    const record = fiscalData[e.id];
    if (!record) return false;
    const isOkXml = record.xml_status === "ok" || record.xml_status === "enviada" || record.xml_status === "gerada";
    if (e.regime_tributario === "lucro_real" || e.regime_tributario === "lucro_presumido") {
      return isOkXml && (record.irpj_csll_status === "enviada" || record.irpj_csll_status === "gerada" || (record.irpj_csll_status as any) === "isento");
    }
    return isOkXml && (record.status_guia === "enviada" || record.status_guia === "gerada" || (record.status_guia as any) === "isento");
  }).length;

  if (empresasLoading || (fiscalLoading && Object.keys(fiscalData).length === 0)) {
    return (<div className="space-y-6"><PageHeaderSkeleton /><TableSkeleton rows={8} /></div>);
  }
  return (
    <div className="space-y-8 animate-fade-in relative pb-20 px-1">
      {/* Syncing Indicator */}
      {(empresasFetching || fiscalFetching) && (
        <div className="fixed top-24 right-8 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 backdrop-blur-md shadow-sm animate-fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span className="text-[10px] font-black text-primary uppercase tracking-tight">Sincronizando...</span>
        </div>
      )}

      {/* Main Page Header */}
      <div className="glass-header sticky top-0 z-10 -mx-4 -mt-4 px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/10">
            <Circle size={28} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic px-0">
              Gestão <span className="text-primary/90">Fiscal</span>
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase italic">
              Escrituração • Tributos • Obrigações
            </p>
          </div>
          <div className="ml-2">
            <FavoriteToggleButton moduleId="fiscal" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsUploaderOpen(true)}
            className="flex items-center gap-2.5 px-6 h-12 bg-black/5 dark:bg-white/5 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-border/10"
          >
            <FileUp size={18} />
            <span>Processar Guia PDF</span>
          </button>
          
          <div className="flex items-center gap-4 px-5 h-12 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl">
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] leading-none mb-0.5">Competência</span>
            <input 
                type="month" 
                value={competencia} 
                onChange={(e) => setCompetencia(e.target.value)} 
                className="bg-transparent border-none focus:ring-0 text-[11px] font-black outline-none text-right h-full text-foreground uppercase tracking-widest cursor-pointer" 
            />
          </div>
        </div>
      </div>

      {/* Stats and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl overflow-hidden h-14 shrink-0 p-1">
            <div className="px-5 py-2 flex flex-col justify-center border-r border-border/5">
              <span className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-wider leading-none mb-1">Empresas</span>
              <span className="text-xl font-black text-foreground leading-none">{filtered.length}</span>
            </div>
            <div className="px-5 py-2 flex flex-col justify-center border-r border-border/5">
              <span className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-wider leading-none mb-1">OK</span>
              <span className="text-xl font-black text-primary leading-none">{completedCount}</span>
            </div>
            <div className="px-5 py-2 flex flex-col justify-center">
              <span className="text-[8px] text-rose-500/60 font-black uppercase tracking-wider leading-none mb-1">Pendentes</span>
              <span className="text-xl font-black text-rose-500 leading-none">{filtered.length - completedCount}</span>
            </div>
          </div>

          <div className="relative flex-1 md:w-[320px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="BUSCAR EMPRESA OU CNPJ..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-11 pr-4 h-14 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl focus:ring-1 focus:ring-primary/20 outline-none text-[11px] font-black uppercase tracking-[0.15em] transition-all placeholder:text-muted-foreground/20" 
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 px-5 h-14 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl min-w-[240px]">
            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] leading-none shrink-0">Recebimento</span>
            <select 
              value={filterRecebimento} 
              onChange={e => setFilterRecebimento(e.target.value)} 
              className="bg-transparent border-none focus:ring-0 text-[10px] font-black outline-none cursor-pointer flex-1 text-foreground"
            >
              <option value="todos">TODOS OS MEIOS</option>
              {recebimentoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-border/10 shrink-0 h-14 items-center">
            {[{ id: "todos", label: "Geral" }, { id: "pendente", label: "Pendentes" }, { id: "concluido", label: "OK" }].map(s => (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id as any)}
                className={`px-6 h-full rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterStatus === s.id ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-xl border border-border/10 overflow-x-auto no-scrollbar gap-1 ml-1">
        {[
          { id: "simples", l: "Simples Nacional" }, 
          { id: "lucro", l: "Lucro Presumido/Real" }, 
          { id: "mei", l: "MEI / Simei" }, 
          { id: "outras", l: "Paralisadas/Baixadas" }
        ].map(t => (
          <button 
            key={t.id} 
            className={`px-8 py-3.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg transition-all whitespace-nowrap ${activeTab === t.id ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground hover:bg-card/20"}`} 
            onClick={() => setActiveTab(t.id as any)}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Main Data Table */}
      <div className="glass-card !p-0 overflow-hidden border-border/10 shadow-none">
        <div className="overflow-x-auto relative">
          <table className="data-table w-full border-collapse">
            <thead>
              <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-border/10">
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 min-w-[200px]">Empresa</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">CNPJ</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Regime</th>
                <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">XML</th>
                <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Guia</th>
                <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Transmissão</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 pr-8">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {filtered.map(emp => {
                const isOpen = expanded === emp.id;
                const record = fiscalData[emp.id];
                const form = editForm[emp.id] || {};
                const isOkXml = record?.xml_status === "ok" || record?.xml_status === "enviada" || record?.xml_status === "gerada";
                const done = (emp.regime_tributario === "lucro_real" || emp.regime_tributario === "lucro_presumido") 
                  ? (isOkXml && (record?.irpj_csll_status === "enviada" || record?.irpj_csll_status === "gerada" || (record?.irpj_csll_status as any) === "isento")) 
                  : (isOkXml && (record?.status_guia === "enviada" || record?.status_guia === "gerada" || (record?.status_guia as any) === "isento"));
                
                return (
                  <React.Fragment key={emp.id}>
                    <tr 
                      className={`group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all ${isOpen ? 'bg-primary/[0.03]' : ''}`}
                      onClick={() => toggleExpand(emp.id)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 border border-border/10 group-hover:border-primary/20 transition-all">
                            <Building2 size={18} className={isOpen ? "text-primary" : "text-muted-foreground/60 transition-colors group-hover:text-primary"} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-foreground text-sm uppercase italic tracking-tight truncate max-w-[200px] leading-tight group-hover:text-primary transition-colors">{emp.nome_empresa}</span>
                            <span className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-[0.15em] mt-1 italic">Tributário: {regimeLabels[emp.regime_tributario] || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wider">{emp.cnpj || "—"}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground/80 border border-border/10">
                          {regimeLabels[emp.regime_tributario] || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${isOkXml ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} border border-transparent`}>
                          {isOkXml ? 'VERIFICADO' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${done ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {record?.status_guia === "enviada" || record?.status_guia === "gerada" ? 'ENVIADA' : 
                           (record?.status_guia === "isento" ? (emp.regime_tributario === 'simples' ? "SEM MVMTO" : "ISENTO") : "PENDENTE")}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center whitespace-nowrap">
                        <span className="text-muted-foreground/60 font-black text-[10px] uppercase italic">
                          {record?.data_envio ? new Date(record.data_envio).toLocaleDateString("pt-BR") : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5 pr-8 text-right">
                        <button className={`p-2 rounded-xl border transition-all ${isOpen ? 'bg-primary text-white border-primary rotate-180' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/40 border-border/10 group-hover:border-primary/50 group-hover:text-primary'}`}>
                          <ChevronDown size={14} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-black/[0.01] dark:bg-white/[0.01]">
                        <td colSpan={7} className="px-6 py-12 pt-8">
                        <div className="max-w-6xl mx-auto space-y-10">
                          <Tabs 
                            value={rowTabs[emp.id] || 'dados'} 
                            onValueChange={(v) => setRowTabs(prev => ({ ...prev, [emp.id]: v as any }))}
                            className="space-y-8"
                          >
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border/10 pb-6">
                              <TabsList className="bg-black/5 dark:bg-white/5 p-1 rounded-xl h-14 border border-border/10">
                                <TabsTrigger value="dados" className="px-10 h-full text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Dados Técnicos</TabsTrigger>
                                <TabsTrigger value="pastas" className="px-10 h-full text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Cloud Drive</TabsTrigger>
                              </TabsList>
                              
                              <button onClick={() => setDialogEmpresa(emp)} className="h-14 px-8 text-[11px] font-black uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-3">
                                <Settings size={18} /> PARÂMETROS DA EMPRESA
                              </button>
                            </div>

                            <TabsContent value="dados" className="space-y-10 animate-in fade-in zoom-in-95 duration-300 outline-none">
                               <div className="space-y-10">
                                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="space-y-2">
                                      <h3 className="text-xl font-black text-foreground uppercase tracking-tight italic flex items-center gap-3">
                                         <span className="w-2 h-8 bg-primary rounded-full" />
                                         Fechamento da Competência
                                      </h3>
                                      <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] pl-5 opacity-40">Período de Apuração: {competencia}</p>
                                    </div>
                                  </div>

                               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                 {[{ l: 'Tipo de Nota', v: form.tipo_nota, i: Building2 }, { l: 'Recebimento', v: form.recebimento_arquivos, i: FileUp }, { l: 'Forma de Envio', v: form.forma_envio, i: Circle }, { l: 'Ramo Empresarial', v: form.ramo_empresarial, i: Settings }]
                                   .map(x => (
                                     <div key={x.l} className="bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-border/10">
                                       <span className="block text-[9px] uppercase text-muted-foreground/40 font-black tracking-[0.2em] mb-4">{x.l}</span>
                                       <div className="flex items-center gap-3">
                                          <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground/20 italic"><x.i size={16} /></div>
                                          <span className="text-xs font-black text-foreground italic uppercase tracking-wider">{x.v || "NÃO INFORMADO"}</span>
                                       </div>
                                     </div>
                                   ))}
                               </div>

                              {(emp.regime_tributario === "lucro_real" || emp.regime_tributario === "lucro_presumido") ? (
                                <div className="space-y-10">
                                   <div className="glass-card !bg-black/5 dark:!bg-white/5 p-8 border-border/10 space-y-8 shadow-none">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                                         <div className="space-y-4">
                                            <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1 italic">Processamento de Notas (XML)</label>
                                            <div className="relative group">
                                               <select 
                                                 value={form.xml_status || "pendente"} 
                                                 onChange={e => updateForm(emp.id, 'xml_status', e.target.value)} 
                                                 className="w-full h-14 pl-14 pr-4 rounded-xl border border-border/10 bg-card text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer appearance-none"
                                               >
                                                 <option value="pendente">Status: Pendente</option>
                                                 <option value="ok">Status: Verificado (OK)</option>
                                               </select>
                                               <div className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${form.xml_status === 'ok' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 shadow-lg shadow-rose-500/20'}`} />
                                            </div>
                                         </div>
                                         <div className="p-6 rounded-2xl border border-dashed border-border/10 text-center md:text-left">
                                            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed opacity-60">
                                              {isOkXml 
                                                ? "O fluxo de documentos desta empresa foi devidamente auditado e está pronto para o fechamento dos tributos federais." 
                                                : "Necessária a conferência das notas fiscais de entrada e saída antes de prosseguir com a apuração do IRPJ/CSLL."}
                                            </p>
                                         </div>
                                      </div>
                                   </div>

                                   <div className="glass-card p-10 border-border/10 space-y-10 shadow-none relative overflow-hidden">
                                      <div className="flex items-center gap-4 relative z-10">
                                         <div className="p-3 rounded-2xl bg-primary text-white shadow-xl shadow-primary/10"><Building2 size={24} /></div>
                                         <h4 className="text-xl font-black text-foreground uppercase tracking-tight italic">Tributação Federal</h4>
                                      </div>
                                      <div className="grid grid-cols-1 gap-12 relative z-10">
                                        {[{ l: 'IRPJ/CSLL', ak1: 'aliquota_irpj', ak2: 'aliquota_csll', sk: 'irpj_csll_status', dk: 'irpj_csll_data_envio' }, { l: 'PIS/COFINS', ak1: 'aliquota_pis', ak2: 'aliquota_cofins', sk: 'pis_cofins_status', dk: 'pis_cofins_data_envio' }]
                                          .map(x => (
                                            <div key={x.l} className="space-y-6">
                                              <div className="flex items-center justify-between border-b border-border/5 pb-4">
                                                <p className="text-sm font-black text-foreground uppercase tracking-[0.1em] italic">{x.l}</p>
                                                <span className="text-[10px] font-black text-primary px-4 py-1.5 rounded-full bg-primary/5 uppercase tracking-widest border border-primary/10 italic">
                                                   Apuração: {form[x.ak1] || "0"}% + {form[x.ak2] || "0"}%
                                                </span>
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div className="md:col-span-2 flex gap-4">
                                                  <div className="flex-1 space-y-2">
                                                    <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Situação Apuração</label>
                                                    <select value={form[x.sk] || "pendente"} onChange={e => updateForm(emp.id, x.sk, e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all">
                                                      <option value="pendente">PENDENTE</option>
                                                      <option value="gerada">GUIA GERADA</option>
                                                      <option value="enviada">ENVIADA AO CLIENTE</option>
                                                      <option value="isento">DISPENSADO / ISENTO</option>
                                                    </select>
                                                  </div>
                                                  <div className="w-28 space-y-2">
                                                    <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Alíq. 1</label>
                                                    <input type="number" step="0.01" value={form[x.ak1] ?? ""} onChange={e => updateForm(emp.id, x.ak1, e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black focus:ring-1 focus:ring-primary/20 outline-none" />
                                                  </div>
                                                  <div className="w-28 space-y-2">
                                                    <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Alíq. 2</label>
                                                    <input type="number" step="0.01" value={form[x.ak2] ?? ""} onChange={e => updateForm(emp.id, x.ak2, e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black focus:ring-1 focus:ring-primary/20 outline-none" />
                                                  </div>
                                                </div>
                                                <div className="space-y-2">
                                                   <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Data Efetuada</label>
                                                   <input type="date" value={form[x.dk] || ""} onChange={e => updateForm(emp.id, x.dk, e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black focus:ring-1 focus:ring-primary/20 outline-none uppercase" />
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                   </div>

                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                      {[{ l: 'ESTADUAL (ICMS)', ak: 'aliquota_icms', sk: 'icms_status', dk: 'icms_data_envio' }, { l: 'MUNICIPAL (ISS)', ak: 'aliquota_iss', sk: 'iss_status', dk: 'iss_data_envio' }].map(x => (
                                        <div key={x.l} className="glass-card p-10 border-border/10 space-y-8 shadow-none group">
                                          <div className="flex items-center justify-between border-b border-border/10 pb-5">
                                             <h4 className="text-xs font-black text-foreground uppercase tracking-[0.2em] italic">{x.l}</h4>
                                             <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Apuração: {form[x.ak] || "0"}%</span>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                              <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Status do Fluxo</label>
                                              <select value={form[x.sk] || "pendente"} onChange={e => updateForm(emp.id, x.sk, e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all">
                                                <option value="pendente">PENDENTE</option>
                                                <option value="gerada">GUIA GERADA</option>
                                                <option value="enviada">NOTIFICADO</option>
                                                <option value="isento">SEM INCIDÊNCIA</option>
                                              </select>
                                            </div>
                                            <div className="space-y-2">
                                               <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Data Envio</label>
                                               <input type="date" value={form[x.dk] || ""} onChange={e => updateForm(emp.id, x.dk, e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black focus:ring-1 focus:ring-primary/20 outline-none uppercase" />
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                   </div>
                                </div>
                              ) : (
                                <div className="glass-card p-10 border-border/10 space-y-12 shadow-none">
                                  <div className="flex items-center justify-between border-b border-border/10 pb-6 relative">
                                    <div className="flex items-center gap-4">
                                       <div className="p-3 rounded-2xl bg-primary/10 text-primary"><CheckCircle size={22} /></div>
                                       <h4 className="text-xl font-black text-foreground uppercase tracking-tight italic">Consolidação de Tributos</h4>
                                    </div>
                                    <div className="flex items-center gap-2.5 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl border border-border/10">
                                      <div className={`w-2.5 h-2.5 rounded-full ${isOkXml ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-rose-500 animate-pulse shadow-lg shadow-rose-500/20"}`} />
                                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">Docs XML: {isOkXml ? "VERIFICADO" : "PENDENTE"}</span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                                    <div className="space-y-3">
                                      <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1 h-3 block">Processamento XML</label>
                                      <select 
                                        value={form.xml_status || "pendente"} 
                                        onChange={e => updateForm(emp.id, 'xml_status', e.target.value)} 
                                        className="w-full h-14 px-5 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                                      >
                                        <option value="pendente">PENDENTE</option>
                                        <option value="ok">FINALIZADO (OK)</option>
                                      </select>
                                    </div>
                                    <div className="space-y-3">
                                      <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1 h-3 block">Status da Guia</label>
                                      <select value={form.status_guia || "pendente"} onChange={e => updateForm(emp.id, "status_guia", e.target.value)} className="w-full h-14 px-5 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all">
                                        <option value="pendente">PENDENTE</option>
                                        <option value="gerada">GUIA GERADA</option>
                                        <option value="enviada">ENVIADA AO CLIENTE</option>
                                        <option value="isento">{emp.regime_tributario === 'simples' ? 'SEM MOVIMENTO (PGDAS)' : 'ISENTO'}</option>
                                      </select>
                                    </div>
                                    <div className="space-y-3">
                                      <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1 h-3 block">Alíquota (%)</label>
                                      <input type="number" step="0.01" value={form.aliquota ?? ""} onChange={e => updateForm(emp.id, "aliquota", e.target.value === "" ? null : parseFloat(e.target.value))} className="w-full h-14 px-5 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[11px] font-black focus:ring-1 focus:ring-primary/20 outline-none" placeholder="0.00" />
                                    </div>
                                    <div className="space-y-3">
                                      <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1 h-3 block">Data Envio</label>
                                      <input type="date" value={form.data_envio || ""} onChange={e => updateForm(emp.id, "data_envio", e.target.value)} className="w-full h-14 px-5 rounded-xl border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black focus:ring-1 focus:ring-primary/20 outline-none uppercase" />
                                    </div>
                                  </div>
                                </div>
                              )}
                               </div>
                               
                               <div className="flex justify-end pt-4">
                                 <button onClick={() => handleSaveAction(emp.id)} className="button-premium px-12 h-18 text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/20 group">
                                   <Save size={22} className="group-hover:scale-110 transition-transform" /> <span>CONFIRMAR FECHAMENTO</span>
                                 </button>
                               </div>
                             </TabsContent>

                             <TabsContent value="pastas" className="animate-in slide-in-from-right-4 duration-500 outline-none">
                                <ModuleFolderView empresa={emp} departamentoId="fiscal" />
                             </TabsContent>
                           </Tabs>
                        </div>
                      </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 border-dashed border-border/10">
              <Search size={64} className="text-muted-foreground/10 mb-8" />
              <p className="text-[12px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] italic">Nenhum registro encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Overlays / Modals */}
      {isUploaderOpen && (
        <TaxGuideUploader
          empresas={empresas}
          onClose={() => setIsUploaderOpen(false)}
          onConfirm={handleBulkConfirm}
          competenciaFiltro={competencia}
        />
      )}

      {dialogEmpresa && (
        <FiscalParametersDialog
          isOpen={!!dialogEmpresa}
          empresa={dialogEmpresa}
          initialData={editForm[dialogEmpresa.id] || {}}
          onClose={() => setDialogEmpresa(null)}
          onSave={handleSaveParameters}
        />
      )}
    </div>
  );
};s}
        />
      )}
    </div>
  );
};

export default FiscalPage;
