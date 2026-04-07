import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle, Building2, FileUp } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useFiscal } from "@/hooks/useFiscal";
import { FiscalRecord, GuiaStatus } from "@/types/fiscal";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { TaxGuideUploader, ProcessingResult } from "@/components/TaxGuideUploader";
import { FiscalParametersDialog } from "@/components/FiscalParametersDialog";

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
    <div className="space-y-6 relative pb-20">
      {(empresasFetching || fiscalFetching) && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-black text-primary uppercase tracking-tight">Sincronizando...</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Departamento <span className="text-primary/90">Fiscal</span></h1>
            <FavoriteToggleButton moduleId="fiscal" />
          </div>
          <p className="subtitle-premium">Gestão de tributos, fechamentos mensais e obrigações acessórias.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploaderOpen(true)}
            className="flex items-center gap-2 px-6 h-12 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all font-black text-[10px] uppercase tracking-widest shrink-0 border border-primary/20 shadow-sm"
          >
            <FileUp size={18} />
            <span>Automação PDF</span>
          </button>
          
          <div className="flex items-center gap-2 px-4 h-12 bg-card border border-border/60 rounded-lg shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Competência:</span>
            <input 
                type="month" 
                value={competencia} 
                onChange={(e) => setCompetencia(e.target.value)} 
                className="bg-transparent border-none focus:ring-0 text-sm font-black outline-none text-center h-full pt-0.5" 
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden h-12 shrink-0">
            <div className="px-5 py-2 flex flex-col justify-center border-r border-border/60">
              <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider leading-none mb-1">Empresas</span>
              <span className="text-lg font-black text-primary leading-none">{filtered.length}</span>
            </div>
            <div className="px-5 py-2 flex flex-col justify-center border-r border-border/60">
              <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider leading-none mb-1">Concluídas</span>
              <span className="text-lg font-black text-emerald-500 leading-none">{completedCount}</span>
            </div>
            <div className="px-5 py-2 flex flex-col justify-center bg-warning/5">
              <span className="text-[8px] text-warning font-black uppercase tracking-wider leading-none mb-1">Pendentes</span>
              <span className="text-lg font-black text-warning leading-none">{filtered.length - completedCount}</span>
            </div>
          </div>

          <div className="relative flex-1 md:w-80 md:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CNPJ..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-11 pr-4 h-12 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-xs shadow-sm font-bold transition-all" 
            />
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {recebimentoOptions.length > 0 && (
            <div className="flex items-center gap-2 px-4 h-12 bg-card border border-border/60 rounded-xl shadow-sm min-w-[240px]">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Recebimento:</span>
              <select 
                value={filterRecebimento} 
                onChange={e => setFilterRecebimento(e.target.value)} 
                className="bg-transparent border-none focus:ring-0 text-[11px] font-black outline-none cursor-pointer flex-1"
              >
                <option value="todos">TODOS</option>
                {recebimentoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}

          <div className="flex bg-muted/30 p-1 rounded-xl border border-border/50 shrink-0 h-12 items-center">
            {[{ id: "todos", label: "Geral" }, { id: "pendente", label: "Pendentes" }, { id: "concluido", label: "Concluídos" }].map(s => (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id as any)}
                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterStatus === s.id ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex bg-muted/30 p-1.5 rounded-xl border border-border/50 overflow-x-auto no-scrollbar gap-1">
        {[
          { id: "simples", l: "Simples Nacional" }, 
          { id: "lucro", l: "Lucro Presumido/Real" }, 
          { id: "mei", l: "MEI / Simei" }, 
          { id: "outras", l: "Paralisadas/Baixadas" }
        ].map(t => (
          <button 
            key={t.id} 
            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === t.id ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/30"}`} 
            onClick={() => setActiveTab(t.id as any)}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="card-premium !p-0 overflow-hidden border border-border/50 shadow-sm">
        <div className="overflow-x-auto relative">
          <table className="data-table w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50">
                <th className="px-2 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground min-w-[180px] whitespace-nowrap">Empresa</th>
                <th className="px-2 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">CNPJ</th>
                <th className="px-2 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Regime</th>
                <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">XML</th>
                <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Guia/Fechamento</th>
                <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data Envio</th>
                <th className="px-2 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground pr-4 whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(emp => {
                const isOpen = expanded === emp.id;
                const record = fiscalData[emp.id];
                const form = editForm[emp.id] || {};
                const isOkXml = record?.xml_status === "ok" || record?.xml_status === "enviada" || record?.xml_status === "gerada";
                const done = (emp.regime_tributario === "lucro_real" || emp.regime_tributario === "lucro_presumido") 
                  ? (isOkXml && (record?.irpj_csll_status === "enviada" || record?.irpj_csll_status === "gerada" || (record?.irpj_csll_status as any) === "isento")) 
                  : (isOkXml && (record?.status_guia === "enviada" || record?.status_guia === "gerada" || (record?.status_guia as any) === "isento"));
                
                const sit = situacaoConfig[emp.situacao || "ativa"] || situacaoConfig.ativa;

                return (
                  <React.Fragment key={emp.id}>
                    <tr 
                      className={`group cursor-pointer hover:bg-muted/30 transition-colors ${isOpen ? 'bg-primary/5 shadow-inner' : ''}`}
                      onClick={() => toggleExpand(emp.id)}
                    >
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10 group-hover:bg-primary group-hover:text-primary-foreground">
                            <Building2 size={18} className={isOpen ? "text-primary group-hover:text-primary-foreground" : "text-muted-foreground group-hover:text-primary-foreground"} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-card-foreground text-sm group-hover:text-primary truncate max-w-[150px] md:max-w-[200px]">{emp.nome_empresa}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-0.5 opacity-60">ID: {emp.id.split('-')[0]}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span className="text-muted-foreground font-mono text-xs">{emp.cnpj || "—"}</span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-muted text-muted-foreground border border-border/50">
                          {regimeLabels[emp.regime_tributario] || "—"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center whitespace-nowrap">
                        <span className={`badge-status ${isOkXml ? 'badge-success' : 'badge-warning'} font-black text-[9px] px-2 py-0.5 shadow-sm`}>
                          {isOkXml ? 'OK' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center whitespace-nowrap">
                        <span className={`badge-status ${done ? 'badge-success' : 'badge-warning'} font-black text-[9px] px-2 py-0.5 shadow-sm`}>
                          {record?.status_guia === "enviada" || record?.status_guia === "gerada" ? 'ENVIADA' : 
                           (record?.status_guia === "isento" ? (emp.regime_tributario === 'simples' ? "SEM MVMTO" : "ISENTO") : "PENDENTE")}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center whitespace-nowrap">
                        <span className="text-muted-foreground font-black text-[10px]">
                          {record?.data_envio ? new Date(record.data_envio).toLocaleDateString("pt-BR") : "—"}
                        </span>
                      </td>
                      <td className="px-2 py-3 pr-4 text-right">
                        <span className={`inline-flex p-1.5 rounded-lg border transition-colors ${isOpen ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary'}`}>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/10 border-t border-border shadow-inner">
                        <td colSpan={7} className="px-2 py-6">
                           <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                     <span className="w-1.5 h-6 bg-primary rounded-full" />
                                     Status Mensal e Fechamento
                                  </h3>
                                  <p className="text-[11px] text-muted-foreground font-bold">Configure os parâmetros e envie as guias para a competência {competencia}.</p>
                                </div>
                                <button onClick={() => setDialogEmpresa(emp)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors border border-primary/20 bg-card shadow-sm">
                                  Ajustar Parâmetros
                                </button>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[{ l: 'Tipo de Nota', v: form.tipo_nota }, { l: 'Recebimento', v: form.recebimento_arquivos }, { l: 'Forma de Envio', v: form.forma_envio }, { l: 'Ramo', v: form.ramo_empresarial }]
                                  .map(x => (
                                    <div key={x.l} className="bg-card p-4 rounded-lg border border-border/50 shadow-sm">
                                      <span className="block text-[9px] uppercase text-muted-foreground font-black tracking-widest mb-1">{x.l}</span>
                                      <span className="text-xs font-black text-foreground">{x.v || "—"}</span>
                                    </div>
                                  ))}
                              </div>

                              {(emp.regime_tributario === "lucro_real" || emp.regime_tributario === "lucro_presumido") ? (
                                <div className="space-y-4">
                                   <div className="bg-card p-5 rounded-xl border border-border/50 shadow-sm">
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                        <div className="flex flex-col gap-1.5">
                                          <label className={`${labelCls} !mb-0`}>Status do XML</label>
                                          <select 
                                            value={form.xml_status || "pendente"} 
                                            onChange={e => updateForm(emp.id, 'xml_status', e.target.value)} 
                                            className={`${inputCls} font-black h-10 ${form.xml_status === 'ok' ? 'text-emerald-500' : 'text-amber-500'}`}
                                          >
                                            <option value="pendente">Pendente</option>
                                            <option value="ok">OK</option>
                                          </select>
                                        </div>
                                        <div className="md:col-span-3 pb-2 flex items-center gap-2.5">
                                          <span className={`w-2.5 h-2.5 rounded-full ${isOkXml ? "bg-emerald-500" : "bg-amber-500"}`} />
                                          <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Fluxo de Documentos {isOkXml ? "Verificado" : "Pendente"}</span>
                                        </div>
                                      </div>
                                   </div>

                                   <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm space-y-6">
                                      <div className="flex items-center gap-3 border-b border-border pb-3">
                                         <div className="p-2 rounded-lg bg-primary/10 text-primary"><Building2 size={18} /></div>
                                         <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Federais</h4>
                                      </div>
                                      <div className="grid grid-cols-1 gap-8">
                                        {[{ l: 'IRPJ/CSLL', ak1: 'aliquota_irpj', ak2: 'aliquota_csll', sk: 'irpj_csll_status', dk: 'irpj_csll_data_envio' }, { l: 'PIS/COFINS', ak1: 'aliquota_pis', ak2: 'aliquota_cofins', sk: 'pis_cofins_status', dk: 'pis_cofins_data_envio' }]
                                          .map(x => (
                                            <div key={x.l} className="space-y-4">
                                              <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-black text-foreground uppercase tracking-widest">{x.l}</p>
                                                <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-lg border border-primary/20 shadow-inner">
                                                   Taxas: {form[x.ak1] || "—"}% / {form[x.ak2] || "—"}%
                                                </span>
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="md:col-span-2 flex gap-4">
                                                  <div className="flex-1">
                                                    <label className={labelCls}>Status Atual</label>
                                                    <select value={form[x.sk] || "pendente"} onChange={e => updateForm(emp.id, x.sk, e.target.value)} className={`${inputCls} h-11 font-black`}>
                                                      <option value="pendente">Pendente</option>
                                                      <option value="gerada">Gerada</option>
                                                      <option value="enviada">Enviada</option>
                                                      <option value="isento">Isento</option>
                                                    </select>
                                                  </div>
                                                  <div className="w-32">
                                                    <label className={labelCls}>Alíq. {x.l.split('/')[0]} (%)</label>
                                                    <input type="number" step="0.01" value={form[x.ak1] ?? ""} onChange={e => updateForm(emp.id, x.ak1, e.target.value === "" ? null : parseFloat(e.target.value))} className={`${inputCls} h-11 font-black`} />
                                                  </div>
                                                  <div className="w-32">
                                                    <label className={labelCls}>Alíq. {x.l.split('/')[1]} (%)</label>
                                                    <input type="number" step="0.01" value={form[x.ak2] ?? ""} onChange={e => updateForm(emp.id, x.ak2, e.target.value === "" ? null : parseFloat(e.target.value))} className={`${inputCls} h-11 font-black`} />
                                                  </div>
                                                </div>
                                                <div>
                                                   <label className={labelCls}>Data de Transmissão</label>
                                                   <input type="date" value={form[x.dk] || ""} onChange={e => updateForm(emp.id, x.dk, e.target.value)} className={`${inputCls} h-11 font-black`} />
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                   </div>

                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {[{ l: 'Estaduais (ICMS)', ak: 'aliquota_icms', sk: 'icms_status', dk: 'icms_data_envio' }, { l: 'Municipais (ISS)', ak: 'aliquota_iss', sk: 'iss_status', dk: 'iss_data_envio' }].map(x => (
                                        <div key={x.l} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm space-y-4">
                                          <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                             <h4 className="text-[11px] font-black text-foreground uppercase tracking-widest">{x.l}</h4>
                                             <span className="text-[9px] font-black text-muted-foreground">Alíquota: {form[x.ak] || "—"}%</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <label className={labelCls}>Situação</label>
                                              <select value={form[x.sk] || "pendente"} onChange={e => updateForm(emp.id, x.sk, e.target.value)} className={`${inputCls} h-10 font-black`}>
                                                <option value="pendente">Pendente</option>
                                                <option value="gerada">Gerada</option>
                                                <option value="enviada">Enviada</option>
                                                <option value="isento">Isento</option>
                                              </select>
                                            </div>
                                            <div>
                                               <label className={labelCls}>Data</label>
                                               <input type="date" value={form[x.dk] || ""} onChange={e => updateForm(emp.id, x.dk, e.target.value)} className={`${inputCls} h-10 font-black`} />
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                   </div>
                                </div>
                              ) : (
                                <div className="bg-card p-6 rounded-3xl border border-border/50 shadow-sm space-y-6">
                                  <div className="flex items-center justify-between border-b border-border pb-3">
                                    <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Fechamento Mensal</h4>
                                    <div className="flex items-center gap-2.5">
                                      <span className={`w-2 h-2 rounded-full ${isOkXml ? "bg-emerald-500" : "bg-amber-500"}`} />
                                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fluxo XML {isOkXml ? "OK" : "Pendente"}</span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                    <div className="flex flex-col gap-1.5">
                                      <label className={`${labelCls} !mb-0`}>Status do XML</label>
                                      <select 
                                        value={form.xml_status || "pendente"} 
                                        onChange={e => updateForm(emp.id, 'xml_status', e.target.value)} 
                                        className={`${inputCls} font-black h-11 ${form.xml_status === 'ok' ? 'text-emerald-500' : 'text-amber-500'}`}
                                      >
                                        <option value="pendente">Pendente</option>
                                        <option value="ok">OK</option>
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <label className={`${labelCls} !mb-0`}>Situação da Guia</label>
                                      <select value={form.status_guia || "pendente"} onChange={e => updateForm(emp.id, "status_guia", e.target.value)} className={`${inputCls} h-11 font-black`}>
                                        <option value="pendente">Pendente</option>
                                        <option value="gerada">Gerada</option>
                                        <option value="enviada">Enviada</option>
                                        <option value="isento">{emp.regime_tributario === 'simples' ? 'PGDAS sem movimento' : 'Isento'}</option>
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <label className={`${labelCls} !mb-0`}>Alíquota Mensal (%)</label>
                                      <input type="number" step="0.01" value={form.aliquota ?? ""} onChange={e => updateForm(emp.id, "aliquota", e.target.value === "" ? null : parseFloat(e.target.value))} className={`${inputCls} h-11 font-black`} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <label className={`${labelCls} !mb-0`}>Data de Transmissão</label>
                                      <input type="date" value={form.data_envio || ""} onChange={e => updateForm(emp.id, "data_envio", e.target.value)} className={`${inputCls} h-11 font-black`} />
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex justify-end pt-4">
                                <button onClick={() => handleSaveAction(emp.id)} className="button-premium px-10 h-14 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                  <Save size={20} /> <span className="text-xs uppercase tracking-widest font-black">Salvar Alterações</span>
                                </button>
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
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 bg-muted/5">
              <Search size={48} className="text-muted-foreground/20 mb-4" />
              <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Nenhuma empresa encontrada nos filtros atuais</p>
            </div>
          )}
        </div>
      </div>

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
};

export default FiscalPage;
