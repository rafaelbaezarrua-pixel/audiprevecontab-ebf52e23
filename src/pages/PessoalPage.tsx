import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle, AlertTriangle, Calendar, Users, UserPlus, Trash2, Settings } from "lucide-react";
import { format, subDays, addDays, isBefore, parseISO } from "date-fns";
import { formatDateBR } from "@/lib/utils";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { usePessoal } from "@/hooks/usePessoal";
import { PessoalRecord, GuiaStatus } from "@/types/pessoal";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { PontoCalculoForm } from "@/components/pessoal/PontoCalculoForm";
import { TaxGuideUploader, ProcessingResult } from "@/components/TaxGuideUploader";
import { FileUp } from "lucide-react";

const PessoalPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const { empresas, loading: empresasLoading, isFetching: empresasFetching } = useEmpresas("pessoal");
  const { pessoalData, loading: pessoalLoading, isFetching: pessoalFetching, savePessoalRecord } = usePessoal(competencia);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei">("ativas");
  const [activeSubTab, setActiveSubTab] = useState<"folha" | "prolabore" | "ponto">("folha");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [funcionarios, setFuncionarios] = useState<Record<string, any[]>>({});
  const [alertsSummary, setAlertsSummary] = useState({ aso: 0, ferias: 0 });

  useEffect(() => {
    const fetchAlerts = async () => {
      const today = new Date();
      const nextMonth = addDays(today, 30);
      const { data: allFuncs } = await (supabase.from("funcionarios" as any).select("*").eq("ativo", true) as any);
      if (allFuncs) {
        const aso = (allFuncs as any[]).filter(f => f.vencimento_aso && isBefore(parseISO(f.vencimento_aso), nextMonth)).length;
        const ferias = (allFuncs as any[]).filter(f => f.vencimento_ferias && isBefore(parseISO(f.vencimento_ferias), nextMonth)).length;
        setAlertsSummary({ aso, ferias });
        const map: Record<string, any[]> = {};
        (allFuncs as any[]).forEach(f => {
          if (!map[f.empresa_id]) map[f.empresa_id] = [];
          map[f.empresa_id].push(f);
        });
        setFuncionarios(map);
      }
    };
    fetchAlerts();
  }, []);

  const filtered = React.useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
      let matchTab = false;
      if (activeTab === "ativas") matchTab = (e.situacao === "ativa" || !e.situacao) && e.porte_empresa !== "mei";
      else if (activeTab === "mei") matchTab = e.situacao === "mei" || ((e.situacao === "ativa" || !e.situacao) && e.porte_empresa === "mei");
      
      let matchSubTab = false;
      if (activeSubTab === "folha") matchSubTab = !!(e as any).possui_funcionarios;
      else if (activeSubTab === "prolabore") matchSubTab = !!(e as any).somente_pro_labore && !(e as any).possui_funcionarios;
      else if (activeSubTab === "ponto") matchSubTab = !!(e as any).possui_cartao_ponto;

      let matchStatus = true;
      if (filterStatus !== "todos") {
        const record = pessoalData[e.id];
        if (!record) matchStatus = filterStatus === 'pendente';
        else {
          if (activeSubTab === "prolabore") {
            const isAllConcluido = !!record.dctf_web_gerada;
            matchStatus = filterStatus === 'concluido' ? isAllConcluido : !isAllConcluido;
          } else {
            const checks = [];
            if (record.possui_vt) checks.push(record.vt_status);
            if (record.possui_va) checks.push(record.va_status);
            if (record.possui_vc) checks.push(record.vc_status);
            checks.push(record.inss_status);
            checks.push(record.fgts_status);
            const isAllConcluido = checks.every(s => s === 'enviada' || s === 'gerada' || s === 'isento') && record.dctf_web_gerada;
            matchStatus = filterStatus === 'concluido' ? isAllConcluido : !isAllConcluido;
          }
        }
      }
      return matchSearch && matchTab && matchSubTab && matchStatus;
    });
  }, [empresas, pessoalData, search, activeTab, activeSubTab, filterStatus]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = (pessoalData[id] || {}) as Partial<PessoalRecord> & Record<string, any>;
    let infoGerais = { forma_envio: "", qtd_funcionarios: 0, qtd_pro_labore: 0, possui_vt: false, possui_va: false, possui_vc: false, possui_recibos: false, qtd_recibos: 0 };

    if (!existing.id) {
      const { data: prev } = await supabase.from("pessoal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        infoGerais = { forma_envio: prev[0].forma_envio || "", qtd_funcionarios: prev[0].qtd_funcionarios || 0, qtd_pro_labore: prev[0].qtd_pro_labore || 0, possui_vt: prev[0].possui_vt || false, possui_va: prev[0].possui_va || false, possui_vc: prev[0].possui_vc || false, possui_recibos: prev[0].possui_recibos || false, qtd_recibos: prev[0].qtd_recibos || 0 };
      }
    } else {
      infoGerais = { forma_envio: existing.forma_envio || "", qtd_funcionarios: existing.qtd_funcionarios || 0, qtd_pro_labore: existing.qtd_pro_labore || 0, possui_vt: existing.possui_vt || false, possui_va: existing.possui_va || false, possui_vc: existing.possui_vc || false, possui_recibos: existing.possui_recibos || false, qtd_recibos: existing.qtd_recibos || 0 };
    }

    const empresa = filtered.find(e => e.id === id);
    const possuiPontoManual = (empresa as any)?.possui_cartao_ponto || false;

    setEditForm(prev => ({
      ...prev, [id]: {
        ...infoGerais,
        possui_ponto_manual: possuiPontoManual,
        vt_status: existing.vt_status || "pendente", vt_data_envio: existing.vt_data_envio || "",
        va_status: existing.va_status || "pendente", va_data_envio: existing.va_data_envio || "",
        vc_status: existing.vc_status || "pendente", vc_data_envio: existing.vc_data_envio || "",
        inss_status: existing.inss_status || "pendente", inss_data_envio: existing.inss_data_envio || "",
        fgts_status: existing.fgts_status || "pendente", fgts_data_envio: existing.fgts_data_envio || "",
        dctf_web_gerada: existing.dctf_web_gerada || false, dctf_web_data_envio: existing.dctf_web_data_envio || "",
      }
    }));
  };

  const handleSaveAction = async (empresaId: string) => {
    const form = editForm[empresaId];
    try {
      const payload = {
        empresa_id: empresaId, competencia, forma_envio: form.forma_envio || null,
        qtd_funcionarios: parseInt(String(form.qtd_funcionarios || 0)) || 0, 
        qtd_pro_labore: parseInt(String(form.qtd_pro_labore || 0)) || 0,
        possui_vt: !!form.possui_vt, possui_va: !!form.possui_va,
        possui_vc: !!form.possui_vc, possui_recibos: !!form.possui_recibos,
        qtd_recibos: parseInt(String(form.qtd_recibos || 0)) || 0,
        vt_status: form.vt_status as GuiaStatus, vt_data_envio: form.vt_data_envio || null,
        va_status: form.va_status as GuiaStatus, va_data_envio: form.va_data_envio || null,
        vc_status: form.vc_status as GuiaStatus, vc_data_envio: form.vc_data_envio || null,
        inss_status: form.inss_status as GuiaStatus, inss_data_envio: form.inss_data_envio || null,
        fgts_status: form.fgts_status as GuiaStatus, fgts_data_envio: form.fgts_data_envio || null,
        dctf_web_gerada: !!form.dctf_web_gerada, dctf_web_data_envio: form.dctf_web_data_envio || null,
      };
      await savePessoalRecord(payload);

      // Update fixed setting in empresas table
      if (form.possui_ponto_manual !== undefined) {
        await (supabase.from("empresas") as any).update({ possui_cartao_ponto: !!form.possui_ponto_manual }).eq("id", empresaId);
        // Refresh companies list to reflect the point setting change immediately
        queryClient.invalidateQueries({ queryKey: ["empresas_modulo"] });
      }

      toast.success("Dados salvos com sucesso!");
      setExpanded(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const handleBulkConfirm = async (guides: ProcessingResult[]) => {
    for (const guide of guides) {
      if (!guide.data || !guide.empresa) continue;
      
      const guideType = guide.data.tipo;
      const payload: any = {
        empresa_id: guide.empresa.id,
        competencia,
      };

      if (guideType?.includes("FGTS")) {
        payload.fgts_status = "enviada";
        payload.fgts_data_envio = new Date().toISOString().split('T')[0];
      } else if (guideType?.includes("INSS")) {
        payload.inss_status = "enviada";
        payload.inss_data_envio = new Date().toISOString().split('T')[0];
      } else if (guideType?.includes("Simples")) {
        payload.dctf_web_gerada = true;
        payload.dctf_web_data_envio = new Date().toISOString().split('T')[0];
      }

      try {
        await savePessoalRecord(payload);
      } catch (e) {
        console.error(`Failed to save guide for ${guide.empresa.nome_empresa}`, e);
      }
    }
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const completedCount = filtered.filter(e => pessoalData[e.id]?.dctf_web_gerada).length;

  if (empresasLoading || (pessoalLoading && Object.keys(pessoalData).length === 0)) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {(empresasFetching || pessoalFetching) && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 shadow-sm animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span className="text-[10px] font-black text-primary uppercase tracking-tight">Sincronizando...</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden h-12">
          <div className="px-4 flex items-center gap-2 border-r border-border/60">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Empresas</span>
            <span className="text-lg font-black text-primary">{filtered.length}</span>
          </div>
          <div className="px-4 flex items-center gap-2 border-r border-border/60">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Concluídas</span>
            <span className="text-lg font-black text-emerald-500">{completedCount}</span>
          </div>
          <div className="px-4 flex items-center gap-2 bg-warning/5">
            <span className="text-[10px] text-warning font-bold uppercase tracking-wider">Pendentes</span>
            <span className="text-lg font-black text-warning">{filtered.length - completedCount}</span>
          </div>
          <div className="px-4 flex items-center gap-4 bg-destructive/5 border-l border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-destructive font-bold uppercase tracking-wider">ASO Vencendo</span>
              <span className="text-lg font-black text-destructive">{alertsSummary.aso}</span>
            </div>
            <div className="flex items-center gap-2 border-l border-destructive/10 pl-4">
              <span className="text-[10px] text-destructive font-bold uppercase tracking-wider">Férias 30d</span>
              <span className="text-lg font-black text-destructive">{alertsSummary.ferias}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          <FavoriteToggleButton moduleId="pessoal" />
          <button 
            onClick={() => setIsUploaderOpen(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all font-bold text-sm"
          >
            <FileUp size={18} />
            <span>Automação PDF</span>
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 h-10 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-[13px] w-full sm:w-56"
            />
          </div>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="px-4 h-10 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-[13px] font-medium"
          />
        </div>

        <div className="flex bg-muted/50 p-1 rounded-lg self-end">
          <button onClick={() => setFilterStatus("todos")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === "todos" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Todos</button>
          <button onClick={() => setFilterStatus("pendente")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === "pendente" ? "bg-card text-orange-500 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Pendentes</button>
          <button onClick={() => setFilterStatus("concluido")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === "concluido" ? "bg-card text-green-500 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Concluídos</button>
        </div>
      </div>

      <div className="flex border-b border-border overflow-x-auto no-scrollbar">
        {["ativas", "mei"].map(t => <button key={t} className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab(t as any)}>Empresas {t === "ativas" ? "Ativas" : "MEI"}</button>)}
      </div>

      <div className="flex gap-2 mb-2">
        {[
          { id: "folha", label: "Folha de Pagamento" },
          { id: "prolabore", label: "Pró-labore" },
          { id: "ponto", label: "Ponto e Recibos" }
        ].map(s => (
          <button 
            key={s.id} 
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${activeSubTab === s.id ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`} 
            onClick={() => setActiveSubTab(s.id as any)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const form = editForm[emp.id] || {};
          const done = pessoalData[emp.id]?.dctf_web_gerada;
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">{done ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}<div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
                <div className="flex items-center gap-2"><span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-muted/10">
                  {activeSubTab === "prolabore" && (
                    <>
                      <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Informações</h3><div className="grid grid-cols-1 gap-4"><div><label className={labelCls}>Qtd Pró-labore</label><input type="number" value={form.qtd_pro_labore || 0} onChange={e => updateForm(emp.id, "qtd_pro_labore", e.target.value)} className={inputCls} /></div></div></div>
                      <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Obrigações - {competencia}</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center"><span className="text-sm font-medium text-card-foreground">DCTF Web (Pró-labore)</span><select value={form.dctf_web_gerada ? "sim" : "nao"} onChange={e => updateForm(emp.id, "dctf_web_gerada", e.target.value === "sim")} className={inputCls}><option value="nao">Não Gerada</option><option value="sim">Gerada</option></select>{form.dctf_web_gerada ? <input type="date" value={form.dctf_web_data_envio || ""} onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)} className={inputCls} /> : <div />}</div></div>
                    </>
                  )}
                  {activeSubTab === "folha" && (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold text-card-foreground mb-3">Informações</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><label className={labelCls}>Forma de Envio</label><input value={form.forma_envio || ""} onChange={e => updateForm(emp.id, "forma_envio", e.target.value)} className={inputCls} /></div>
                          <div><label className={labelCls}>Qtd Funcionários</label><input type="number" value={form.qtd_funcionarios || 0} onChange={e => updateForm(emp.id, "qtd_funcionarios", e.target.value)} className={inputCls} /></div>
                          <div><label className={labelCls}>Qtd Pró-labore</label><input type="number" value={form.qtd_pro_labore || 0} onChange={e => updateForm(emp.id, "qtd_pro_labore", e.target.value)} className={inputCls} /></div>
                          <div>
                            <label className={labelCls}>Módulo Ponto?</label>
                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-border bg-background hover:bg-muted/30 h-[38px] transition-colors">
                              <input 
                                type="checkbox" 
                                checked={!!form.possui_ponto_manual} 
                                onChange={e => updateForm(emp.id, "possui_ponto_manual", e.target.checked)} 
                                className="w-4 h-4 rounded border-border text-primary" 
                              />
                              <span className="text-xs font-bold text-primary whitespace-nowrap">Ponto Manual</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Trabalhistas - {competencia}</h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3 items-center"><label className="flex items-center gap-2 text-sm font-medium text-card-foreground cursor-pointer"><input type="checkbox" checked={form.possui_recibos || false} onChange={e => updateForm(emp.id, "possui_recibos", e.target.checked)} className="w-4 h-4 rounded border-border text-primary" /> Recibos </label>{form.possui_recibos ? <div><label className={labelCls}>Qtd Recibos</label><input type="number" value={form.qtd_recibos || 0} onChange={e => updateForm(emp.id, "qtd_recibos", e.target.value)} className={inputCls} /></div> : <div />}<div /></div>
                          {[{ label: "VT", k: "vt" }, { label: "VA", k: "va" }, { label: "VC", k: "vc" }].map(x => (
                            <div key={x.k} className="grid grid-cols-3 gap-3 items-center"><label className="flex items-center gap-2 text-sm font-medium text-card-foreground cursor-pointer"><input type="checkbox" checked={form[`possui_${x.k}`] || false} onChange={e => updateForm(emp.id, `possui_${x.k}`, e.target.checked)} className="w-4 h-4 rounded border-border text-primary" /> {x.label} </label>{form[`possui_${x.k}`] ? <><select value={form[`${x.k}_status`] || "pendente"} onChange={e => updateForm(emp.id, `${x.k}_status`, e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select><input type="date" value={form[`${x.k}_data_envio`] || ""} onChange={e => updateForm(emp.id, `${x.k}_data_envio`, e.target.value)} className={inputCls} /></> : <><div /><div /></>}</div>
                          ))}
                        </div>
                      </div>
                      <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Encargos - {competencia}</h3>
                        <div className="space-y-3">
                          {[{ l: "INSS", s: "inss_status", d: "inss_data_envio" }, { l: "FGTS", s: "fgts_status", d: "fgts_data_envio" }].map(enc => (
                             <div key={enc.l} className="grid grid-cols-3 gap-3 items-center"><span className="text-sm font-medium text-card-foreground">{enc.l}</span><select value={form[enc.s] || "pendente"} onChange={e => updateForm(emp.id, enc.s, e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select><input type="date" value={form[enc.d] || ""} onChange={e => updateForm(emp.id, enc.d, e.target.value)} className={inputCls} /></div>
                          ))}
                          <div className="grid grid-cols-3 gap-3 items-center"><span className="text-sm font-medium text-card-foreground">DCTF Web</span><select value={form.dctf_web_gerada ? "sim" : "nao"} onChange={e => updateForm(emp.id, "dctf_web_gerada", e.target.value === "sim")} className={inputCls}><option value="nao">Não Gerada</option><option value="sim">Gerada</option></select>{form.dctf_web_gerada ? <input type="date" value={form.dctf_web_data_envio || ""} onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)} className={inputCls} /> : <div />}</div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-3 pt-3 border-t border-border"><h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2"><Users size={16} className="text-primary" /> Funcionários & Alertas</h3><button onClick={(e) => { e.stopPropagation(); navigate(`/pessoal/funcionarios/${emp.id}`); }} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1"><Settings size={12} /> Gerenciar</button></div>
                        <div className="space-y-2">
                          {(funcionarios[emp.id] || []).length === 0 ? <p className="text-xs text-muted-foreground italic bg-background/50 p-2 rounded-lg border border-dashed border-border">Nenhum funcionário cadastrado.</p> : (
                            funcionarios[emp.id].map(func => (<div key={func.id} className="p-3 bg-background/50 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-sm font-medium">{func.nome}</p><div className="flex flex-wrap gap-3 mt-1"><div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${func.vencimento_aso && isBefore(parseISO(func.vencimento_aso), addDays(new Date(), 30)) ? "text-destructive" : "text-muted-foreground"}`}><AlertTriangle size={12} /> ASO: {func.vencimento_aso ? formatDateBR(func.vencimento_aso) : "N/D"}</div><div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${func.vencimento_ferias && isBefore(parseISO(func.vencimento_ferias), addDays(new Date(), 30)) ? "text-destructive" : "text-muted-foreground"}`}><Calendar size={12} /> Férias: {func.vencimento_ferias ? formatDateBR(func.vencimento_ferias) : "N/D"}</div></div></div></div>))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {activeSubTab === "ponto" && (
                    <PontoCalculoForm 
                      empresa={emp as any} 
                      funcionarios={funcionarios[emp.id] || []} 
                    />
                  )}
                  {activeSubTab !== "ponto" && (
                    <div className="flex justify-end pt-2">
                      <button onClick={() => handleSaveAction(emp.id)} className="button-premium shadow-md">
                        <Save size={14} /> Salvar
                      </button>
                    </div>
                  )}
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
    </div>
  );
};

export default PessoalPage;
