import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useFiscal } from "@/hooks/useFiscal";
import { FiscalRecord, GuiaStatus } from "@/types/fiscal";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI" };

const FiscalPage: React.FC = () => {
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const { empresas, loading: empresasLoading, isFetching: empresasFetching } = useEmpresas("fiscal");
  const { fiscalData, loading: fiscalLoading, isFetching: fiscalFetching, saveFiscalRecord } = useFiscal(competencia);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");
  
  const filtered = React.useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
      let matchTab = false;
      if (activeTab === "ativas") matchTab = (e.situacao === "ativa" || !e.situacao) && e.porte_empresa !== "mei";
      else if (activeTab === "mei") matchTab = e.situacao === "mei" || ((e.situacao === "ativa" || !e.situacao) && e.porte_empresa === "mei");
      else if (activeTab === "paralisadas") matchTab = e.situacao === "paralisada";
      else if (activeTab === "baixadas") matchTab = e.situacao === "baixada";
      else if (activeTab === "entregue") matchTab = e.situacao === "entregue";

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
      return matchSearch && matchTab && matchStatus;
    });
  }, [empresas, fiscalData, search, activeTab, filterStatus]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = (fiscalData[id] || {}) as Partial<FiscalRecord>;
    let fixedFields = { tipo_nota: "", recebimento_arquivos: "", aliquota: "", ramo_empresarial: "", aliquota_irpj: "", aliquota_csll: "", aliquota_pis: "", aliquota_cofins: "", aliquota_icms: "", aliquota_iss: "", aliquota_cbs: "", aliquota_ibs: "" };

    if (!existing.id) {
      const { data: prev } = await supabase.from("fiscal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        fixedFields = { tipo_nota: prev[0].tipo_nota || "", recebimento_arquivos: prev[0].recebimento_arquivos || "", aliquota: prev[0].aliquota?.toString() || "", ramo_empresarial: prev[0].ramo_empresarial || "", aliquota_irpj: prev[0].aliquota_irpj?.toString() || "", aliquota_csll: prev[0].aliquota_csll?.toString() || "", aliquota_pis: prev[0].aliquota_pis?.toString() || "", aliquota_cofins: prev[0].aliquota_cofins?.toString() || "", aliquota_icms: prev[0].aliquota_icms?.toString() || "", aliquota_iss: prev[0].aliquota_iss?.toString() || "", aliquota_cbs: prev[0].aliquota_cbs?.toString() || "", aliquota_ibs: prev[0].aliquota_ibs?.toString() || "" };
      }
    } else {
      fixedFields = { tipo_nota: existing.tipo_nota || "", recebimento_arquivos: existing.recebimento_arquivos || "", aliquota: existing.aliquota?.toString() || "", ramo_empresarial: existing.ramo_empresarial || "", aliquota_irpj: existing.aliquota_irpj?.toString() || "", aliquota_csll: existing.aliquota_csll?.toString() || "", aliquota_pis: existing.aliquota_pis?.toString() || "", aliquota_cofins: existing.aliquota_cofins?.toString() || "", aliquota_icms: existing.aliquota_icms?.toString() || "", aliquota_iss: existing.aliquota_iss?.toString() || "", aliquota_cbs: existing.aliquota_cbs?.toString() || "", aliquota_ibs: existing.aliquota_ibs?.toString() || "" };
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden h-12">
          <div className="px-4 flex items-center gap-2 border-r border-border/60"><span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Empresas</span><span className="text-lg font-black text-primary">{filtered.length}</span></div>
          <div className="px-4 flex items-center gap-2 border-r border-border/60"><span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Concluídas</span><span className="text-lg font-black text-emerald-500">{completedCount}</span></div>
          <div className="px-4 flex items-center gap-2 bg-warning/5"><span className="text-[10px] text-warning font-bold uppercase tracking-wider">Pendentes</span><span className="text-lg font-black text-warning">{filtered.length - completedCount}</span></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          <FavoriteToggleButton moduleId="fiscal" />
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input type="text" placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 h-10 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-[13px] w-full sm:w-56" /></div>
          <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="px-4 h-10 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-[13px] font-medium" />
        </div>
        <div className="flex bg-muted/50 p-1 rounded-lg self-end">
          {["todos", "pendente", "concluido"].map(s => <button key={s} onClick={() => setFilterStatus(s as any)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{s.charAt(0).toUpperCase() + s.slice(1)}s</button>)}
        </div>
      </div>

      <div className="flex border-b border-border overflow-x-auto no-scrollbar">
        {["ativas", "mei", "paralisadas", "baixadas", "entregue"].map(t => <button key={t} className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab(t as any)}>Empresas {t.charAt(0).toUpperCase() + t.slice(1)}s</button>)}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[{l: 'Tipo de Nota', k: 'tipo_nota', p: 'NFE, NFCE, NFSE'}, {l: 'Recebimento', k: 'recebimento_arquivos', p: 'Email...'}, {l: 'Forma de Envio', k: 'forma_envio', p: 'WhatsApp...'}, {l: 'Ramo', k: 'ramo_empresarial', p: 'Comércio...'}]
                    .map(x => <div key={x.k}><label className={labelCls}>{x.l}</label><input value={form[x.k] || ""} onChange={e => updateForm(emp.id, x.k, e.target.value)} className={inputCls} placeholder={x.p} /></div>)}
                  </div>
                  {emp.regime_tributario === "lucro_real" || emp.regime_tributario === "lucro_presumido" ? (
                    <div className="space-y-6">
                      <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-foreground border-b border-border pb-2">Federais</h4>
                        {[{l: 'IRPJ/CSLL', ak1: 'aliquota_irpj', ak2: 'aliquota_csll', sk: 'irpj_csll_status', dk: 'irpj_csll_data_envio'}, {l: 'PIS/COFINS', ak1: 'aliquota_pis', ak2: 'aliquota_cofins', sk: 'pis_cofins_status', dk: 'pis_cofins_data_envio'}]
                        .map(x => <div key={x.l} className="space-y-2"><p className="text-[10px] font-black text-muted-foreground uppercase">{x.l}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><label className={labelCls}>Alíq. 1 (%)</label><input value={form[x.ak1] || ""} onChange={e => updateForm(emp.id, x.ak1, e.target.value)} className={inputCls} /></div><div><label className={labelCls}>Alíq. 2 (%)</label><input value={form[x.ak2] || ""} onChange={e => updateForm(emp.id, x.ak2, e.target.value)} className={inputCls} /></div><div><label className={labelCls}>Status</label><select value={form[x.sk] || "pendente"} onChange={e => updateForm(emp.id, x.sk, e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option><option value="isento">Isento</option></select></div><div><label className={labelCls}>Data</label><input type="date" value={form[x.dk] || ""} onChange={e => updateForm(emp.id, x.dk, e.target.value)} className={inputCls} /></div></div></div>)}
                      </div>
                      {[{l: 'Estaduais (ICMS)', ak: 'aliquota_icms', sk: 'icms_status', dk: 'icms_data_envio'}, {l: 'Municipais (ISS)', ak: 'aliquota_iss', sk: 'iss_status', dk: 'iss_data_envio'}].map(x => (
                        <div key={x.l} className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4"><h4 className="text-sm font-bold text-foreground border-b border-border pb-2">{x.l}</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className={labelCls}>Alíquota (%)</label><input value={form[x.ak] || ""} onChange={e => updateForm(emp.id, x.ak, e.target.value)} className={inputCls} /></div><div><label className={labelCls}>Status</label><select value={form[x.sk] || "pendente"} onChange={e => updateForm(emp.id, x.sk, e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option><option value="isento">Isento</option></select></div><div><label className={labelCls}>Data</label><input type="date" value={form[x.dk] || ""} onChange={e => updateForm(emp.id, x.dk, e.target.value)} className={inputCls} /></div></div></div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className={labelCls}>Alíquota Geral (%)</label><input value={form.aliquota || ""} onChange={e => updateForm(emp.id, "aliquota", e.target.value)} className={inputCls} /></div><div><label className={labelCls}>Status Guia Única</label><select value={form.status_guia || "pendente"} onChange={e => updateForm(emp.id, "status_guia", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option><option value="isento">Isento</option></select></div><div><label className={labelCls}>Data de Envio</label><input type="date" value={form.data_envio || ""} onChange={e => updateForm(emp.id, "data_envio", e.target.value)} className={inputCls} /></div></div></div>
                  )}
                  <div className="flex justify-end pt-2"><button onClick={() => handleSaveAction(emp.id)} className="button-premium shadow-md"><Save size={16} /> Salvar Alterações</button></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FiscalPage;
