import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useFiscal } from "@/hooks/useFiscal";
import { FiscalRecord, GuiaStatus } from "@/types/fiscal";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { TaxGuideUploader, ProcessingResult } from "@/components/TaxGuideUploader";
import { FileUp } from "lucide-react";
import { FiscalParametersDialog } from "@/components/FiscalParametersDialog";

const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI", simei: "Simei" };

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
    let fixedFields = { tipo_nota: "", recebimento_arquivos: "", aliquota: null as number | null, ramo_empresarial: "", aliquota_irpj: null as number | null, aliquota_csll: null as number | null, aliquota_pis: null as number | null, aliquota_cofins: null as number | null, aliquota_icms: null as number | null, aliquota_iss: null as number | null, aliquota_cbs: null as number | null, aliquota_ibs: null as number | null };

    if (!existing.id) {
      const { data: prev } = await supabase.from("fiscal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        fixedFields = { tipo_nota: prev[0].tipo_nota || "", recebimento_arquivos: prev[0].recebimento_arquivos || "", aliquota: prev[0].aliquota, ramo_empresarial: prev[0].ramo_empresarial || "", aliquota_irpj: prev[0].aliquota_irpj, aliquota_csll: prev[0].aliquota_csll, aliquota_pis: prev[0].aliquota_pis, aliquota_cofins: prev[0].aliquota_cofins, aliquota_icms: prev[0].aliquota_icms, aliquota_iss: prev[0].aliquota_iss, aliquota_cbs: prev[0].aliquota_cbs, aliquota_ibs: prev[0].aliquota_ibs };
      }
    } else {
      fixedFields = { tipo_nota: existing.tipo_nota || "", recebimento_arquivos: existing.recebimento_arquivos || "", aliquota: existing.aliquota, ramo_empresarial: existing.ramo_empresarial || "", aliquota_irpj: existing.aliquota_irpj, aliquota_csll: existing.aliquota_csll, aliquota_pis: existing.aliquota_pis, aliquota_cofins: existing.aliquota_cofins, aliquota_icms: existing.aliquota_icms, aliquota_iss: existing.aliquota_iss, aliquota_cbs: existing.aliquota_cbs, aliquota_ibs: existing.aliquota_ibs };
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
        empresa_id: empresaId, competencia, tipo_nota: form.tipo_nota || null, recebimento_arquivos: form.recebimento_arquivos || null, forma_envio: form.forma_envio || null, aliquota: form.aliquota ? parseFloat(String(form.aliquota)) : null, status_guia: form.status_guia || "pendente", data_envio: form.data_envio || null, observacoes: form.observacoes || {}, ramo_empresarial: form.ramo_empresarial || null,
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
    if (e.regime_tributario === "lucro_real" || e.regime_tributario === "lucro_presumido") return (record.irpj_csll_status === "enviada" || record.irpj_csll_status === "gerada" || (record.irpj_csll_status as any) === "isento");
    return (record.status_guia === "enviada" || record.status_guia === "gerada" || (record.status_guia as any) === "isento");
  }).length;

  if (empresasLoading || (fiscalLoading && Object.keys(fiscalData).length === 0)) {
    return (<div className="space-y-6"><PageHeaderSkeleton /><TableSkeleton rows={8} /></div>);
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      {(empresasFetching || fiscalFetching) && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 shadow-sm animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span className="text-[10px] font-black text-primary uppercase tracking-tight">Sincronizando...</span>
        </div>
      )}
      <div className="flex flex-col gap-4 pb-2">
        {/* Row 1: Dashboard, Actions, Search, Date */}
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden h-14 shrink-0">
            <div className="px-5 py-2 flex flex-col justify-center border-r border-border/60"><span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider leading-tight">Empresas</span><span className="text-xl font-black text-primary leading-tight">{filtered.length}</span></div>
            <div className="px-5 py-2 flex flex-col justify-center border-r border-border/60"><span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider leading-tight">Concluídas</span><span className="text-xl font-black text-emerald-500 leading-tight">{completedCount}</span></div>
            <div className="px-5 py-2 flex flex-col justify-center bg-warning/5"><span className="text-[9px] text-warning font-bold uppercase tracking-wider leading-tight">Pendentes</span><span className="text-xl font-black text-warning leading-tight">{filtered.length - completedCount}</span></div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <FavoriteToggleButton moduleId="fiscal" />
            <button
              onClick={() => setIsUploaderOpen(true)}
              className="flex items-center gap-2 px-4 h-12 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all font-bold text-sm shrink-0 border border-primary/20 shadow-sm"
            >
              <FileUp size={18} />
              <span>Automação PDF</span>
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 h-12 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-[13px] shadow-sm font-medium" />
          </div>

          <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="px-4 h-12 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-[13px] font-black shrink-0 shadow-sm min-w-[180px] text-center" />
        </div>

        {/* Row 2: Filters and Status Buttons */}
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex-1">
            {recebimentoOptions.length > 0 && (
              <select value={filterRecebimento} onChange={e => setFilterRecebimento(e.target.value)} className="px-5 h-12 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-[13px] min-w-[280px] font-bold shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
                <option value="todos">Todas as Formas de Recebimento</option>
                {recebimentoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>

          <div className="flex bg-muted/40 p-1.5 rounded-xl border border-border/50 shrink-0">
            {[{ id: "todos", label: "Visão Geral" }, { id: "pendente", label: "Pendentes" }, { id: "concluido", label: "Concluídos" }].map(s => (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id as any)}
                className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all whitespace-nowrap tracking-wide min-w-[120px] ${filterStatus === s.id ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex border-b border-border overflow-x-auto no-scrollbar">
        {[{ id: "simples", l: "Simples Nacional" }, { id: "lucro", l: "Lucro Presumido/Real" }, { id: "mei", l: "MEI" }, { id: "outras", l: "Paralisadas/Baixadas" }].map(t => <button key={t.id} className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab(t.id as any)}>{t.l}</button>)}
      </div>

      <div className="space-y-3">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const form = editForm[emp.id] || {};
          const record = fiscalData[emp.id];
          const done = (emp.regime_tributario === "lucro_real" || emp.regime_tributario === "lucro_presumido") ? (record?.irpj_csll_status === "enviada" || record?.irpj_csll_status === "gerada" || (record?.irpj_csll_status as any) === "isento") : (record?.status_guia === "enviada" || record?.status_guia === "gerada" || (record?.status_guia as any) === "isento");
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">{done ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}<div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"} • {regimeLabels[emp.regime_tributario] || "—"}</p></div></div>
                <div className="flex items-center gap-2"><span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-muted/10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-foreground">Status Mensal e Fechamento</h3>
                    <button onClick={() => setDialogEmpresa(emp)} className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors border border-primary/20">
                      Ajustar Parâmetros
                    </button>
                  </div>

                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-wrap gap-x-6 gap-y-4 mb-4">
                    {[{ l: 'Tipo de Nota', v: form.tipo_nota }, { l: 'Recebimento', v: form.recebimento_arquivos }, { l: 'Forma de Envio', v: form.forma_envio }, { l: 'Ramo', v: form.ramo_empresarial }]
                      .map(x => <div key={x.l} className="flex-1 min-w-[120px]"><span className="block text-[10px] uppercase text-muted-foreground font-bold">{x.l}</span><span className="text-sm font-black text-foreground">{x.v || "—"}</span></div>)}
                  </div>

                  {emp.regime_tributario === "lucro_real" || emp.regime_tributario === "lucro_presumido" ? (
                    <div className="space-y-6">
                      <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-foreground border-b border-border pb-2">Federais</h4>
                        {[{ l: 'IRPJ/CSLL', ak1: 'aliquota_irpj', ak2: 'aliquota_csll', sk: 'irpj_csll_status', dk: 'irpj_csll_data_envio' }, { l: 'PIS/COFINS', ak1: 'aliquota_pis', ak2: 'aliquota_cofins', sk: 'pis_cofins_status', dk: 'pis_cofins_data_envio' }]
                          .map(x => (
                            <div key={x.l} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black text-foreground uppercase">{x.l}</p>
                                <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md border border-border">Alíq: {form[x.ak1] || "—"}% / {form[x.ak2] || "—"}%</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className={labelCls}>Status</label><select value={form[x.sk] || "pendente"} onChange={e => updateForm(emp.id, x.sk, e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option><option value="isento">Isento</option></select></div>
                                <div><label className={labelCls}>Data</label><input type="date" value={form[x.dk] || ""} onChange={e => updateForm(emp.id, x.dk, e.target.value)} className={inputCls} /></div>
                              </div>
                            </div>
                          ))}
                      </div>
                      {[{ l: 'Estaduais (ICMS)', ak: 'aliquota_icms', sk: 'icms_status', dk: 'icms_data_envio' }, { l: 'Municipais (ISS)', ak: 'aliquota_iss', sk: 'iss_status', dk: 'iss_data_envio' }].map(x => (
                        <div key={x.l} className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-3"><div className="flex items-center gap-2"><h4 className="text-[10px] font-black text-foreground uppercase">{x.l}</h4><span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md border border-border">Alíq: {form[x.ak] || "—"}%</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className={labelCls}>Status</label><select value={form[x.sk] || "pendente"} onChange={e => updateForm(emp.id, x.sk, e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option><option value="isento">Isento</option></select></div><div><label className={labelCls}>Data</label><input type="date" value={form[x.dk] || ""} onChange={e => updateForm(emp.id, x.dk, e.target.value)} className={inputCls} /></div></div></div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-3"><div className="flex items-center gap-2"><h4 className="text-[10px] font-black text-foreground uppercase">Guia Única</h4><span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md border border-border">Alíq Geral: {form.aliquota || "—"}%</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className={labelCls}>Status Guia Única</label><select value={form.status_guia || "pendente"} onChange={e => updateForm(emp.id, "status_guia", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option><option value="isento">{emp.regime_tributario === 'simples' ? 'PGDAS sem movimento' : 'Isento'}</option></select></div><div><label className={labelCls}>Data de Envio</label><input type="date" value={form.data_envio || ""} onChange={e => updateForm(emp.id, "data_envio", e.target.value)} className={inputCls} /></div></div></div>
                  )}
                  <div className="flex justify-end pt-2"><button onClick={() => handleSaveAction(emp.id)} className="button-premium shadow-md"><Save size={16} /> Salvar Alterações</button></div>
                </div>
              )}
            </div>
          );
        })}
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
