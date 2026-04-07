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
    <div className="space-y-6 animate-fade-in pb-20 relative">
      {(empresasFetching || pessoalFetching) && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 shadow-sm animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span className="text-[10px] font-black text-primary uppercase tracking-tight">Sincronizando...</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Departamento <span className="text-primary/90">Pessoal</span></h1>
            <FavoriteToggleButton moduleId="pessoal" />
          </div>
          <p className="subtitle-premium">Gestão de funcionários, folha de pagamento e obrigações trabalhistas.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploaderOpen(true)}
            className="flex items-center gap-2 px-6 h-12 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shrink-0 border border-primary/20 shadow-sm"
          >
            <FileUp size={18} />
            <span>Automação PDF</span>
          </button>
          
          <div className="flex items-center gap-2 px-4 h-12 bg-card border border-border/60 rounded-xl shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Competência:</span>
            <input 
              type="month" 
              value={competencia} 
              onChange={(e) => setCompetencia(e.target.value)} 
              className="bg-transparent border-none focus:ring-0 text-sm font-black outline-none text-center h-full pt-0.5 w-[120px]" 
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 pb-2">
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
              <div className="px-5 py-2 flex flex-col justify-center bg-orange-500/5">
                <span className="text-[8px] text-orange-600 font-black uppercase tracking-wider leading-none mb-1">Pendentes</span>
                <span className="text-lg font-black text-orange-500">{filtered.length - completedCount}</span>
              </div>
              <div className="px-5 py-2 flex flex-col justify-center bg-destructive/5">
                <span className="text-[8px] text-destructive font-black uppercase tracking-wider leading-none mb-1">Alertas RH</span>
                <span className="text-lg font-black text-destructive">{alertsSummary.aso + alertsSummary.ferias}</span>
              </div>
            </div>

            <div className="relative flex-1 md:w-80 md:flex-initial">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Buscar funcionário ou empresa..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full pl-11 pr-4 h-12 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-xs shadow-sm font-bold transition-all" 
              />
            </div>
          </div>

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

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2">
          <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/50 overflow-x-auto no-scrollbar gap-1 w-full md:w-auto">
            {[{ id: "ativas", label: "Ativas" }, { id: "mei", label: "MEI" }].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/30"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/50 overflow-x-auto no-scrollbar gap-1 w-full md:w-auto">
            {[
              { id: "folha", label: "Folha / VT / VR" },
              { id: "prolabore", label: "Pró-Labore" },
              { id: "ponto", label: "Cartão Ponto" }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveSubTab(t.id as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === t.id ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/30"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const form = editForm[emp.id] || {};
          const record = pessoalData[emp.id];
          const done = record?.dctf_web_gerada;

          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/60">
              <div 
                className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors" 
                onClick={() => toggleExpand(emp.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${done ? "bg-emerald-100 text-emerald-600" : "bg-warning/10 text-warning"}`}>
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-card-foreground">{emp.nome_empresa}</p>
                    <p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>
                    {done ? "Concluído" : "Pendente"}
                  </span>
                  {isOpen ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-6 space-y-6 bg-muted/10 animate-in slide-in-from-top-2 duration-200">
                  {activeSubTab === "ponto" ? (
                    <PontoCalculoForm 
                      empresa={emp as any} 
                      funcionarios={funcionarios[emp.id] || []} 
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Section: Configurações & Informações */}
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1 mb-2">Configurações & Informações</h3>
                          <div className="bg-card p-4 rounded-2xl border border-border/60 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">Qtd Funcionários</label>
                                <input type="number" value={form.qtd_funcionarios || 0} onChange={e => updateForm(emp.id, "qtd_funcionarios", e.target.value)} className="w-full h-10 bg-transparent border-b-2 border-border focus:border-primary outline-none transition-all text-sm font-bold" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">Qtd Pró-labore</label>
                                <input type="number" value={form.qtd_pro_labore || 0} onChange={e => updateForm(emp.id, "qtd_pro_labore", e.target.value)} className="w-full h-10 bg-transparent border-b-2 border-border focus:border-primary outline-none transition-all text-sm font-bold" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">Forma de Envio</label>
                                <input value={form.forma_envio || ""} onChange={e => updateForm(emp.id, "forma_envio", e.target.value)} className="w-full h-10 bg-transparent border-b-2 border-border focus:border-primary outline-none transition-all text-sm font-bold" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">Ponto Manual?</label>
                                <label className="flex items-center gap-2 cursor-pointer pt-1">
                                    <input type="checkbox" checked={!!form.possui_ponto_manual} onChange={e => updateForm(emp.id, "possui_ponto_manual", e.target.checked)} className="w-4 h-4 rounded border-border text-primary cursor-pointer" />
                                    <span className="text-[10px] font-black text-primary uppercase">SIM</span>
                                </label>
                            </div>
                          </div>
                        </div>

                        {/* Section: Obrigações Mensais */}
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1 mb-2">Obrigações Mensais - {competencia}</h3>
                          <div className="bg-card p-4 rounded-2xl border border-border/60 shadow-sm space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                                <span className="text-[11px] font-black text-card-foreground uppercase">DCTF Web</span>
                                <select value={form.dctf_web_gerada ? "sim" : "nao"} onChange={e => updateForm(emp.id, "dctf_web_gerada", e.target.value === "sim")} className="h-10 bg-muted/30 border border-border/60 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20">
                                    <option value="nao">NÃO GERADA</option>
                                    <option value="sim">GERADA</option>
                                </select>
                                {form.dctf_web_gerada && <input type="date" value={form.dctf_web_data_envio || ""} onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)} className="h-10 bg-muted/30 border border-border/60 rounded-xl px-3 text-xs font-bold outline-none" />}
                            </div>

                            {activeSubTab === "folha" && (
                              <div className="pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[{ label: "INSS", s: "inss_status", d: "inss_data_envio" }, { label: "FGTS", s: "fgts_status", d: "fgts_data_envio" }].map(enc => (
                                  <div key={enc.label} className="space-y-1">
                                    <label className="text-[9px] font-black text-muted-foreground uppercase pl-1">{enc.label}</label>
                                    <div className="flex gap-2">
                                        <select value={form[enc.s] || "pendente"} onChange={e => updateForm(emp.id, enc.s, e.target.value)} className="flex-1 h-10 bg-muted/30 border border-border/60 rounded-xl px-3 text-[10px] font-black outline-none">
                                            <option value="pendente">PENDENTE</option>
                                            <option value="gerada">GERADA</option>
                                            <option value="enviada">ENVIADA</option>
                                        </select>
                                        <input type="date" value={form[enc.d] || ""} onChange={e => updateForm(emp.id, enc.d, e.target.value)} className="flex-1 h-10 bg-muted/30 border border-border/60 rounded-xl px-2 text-[10px] font-medium outline-none" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section: Funcionários & Alertas */}
                      <div className="space-y-4">
                         <div className="flex items-center justify-between pl-1">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Funcionários & Alertas</h3>
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/pessoal/funcionarios/${emp.id}`); }} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors">
                                <Settings size={14} /> GERENCIAR EQUIPE
                            </button>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(funcionarios[emp.id] || []).length === 0 ? (
                                <div className="col-span-full p-6 text-center bg-card border border-dashed border-border/60 rounded-2xl">
                                    <p className="text-xs text-muted-foreground font-medium italic">Nenhum funcionário cadastrado nesta empresa.</p>
                                </div>
                            ) : (
                                funcionarios[emp.id].map(func => (
                                    <div key={func.id} className="p-4 bg-card border border-border/60 rounded-2xl shadow-sm space-y-3">
                                        <p className="text-sm font-black text-card-foreground truncate">{func.nome}</p>
                                        <div className="flex flex-col gap-2">
                                            <div className={`flex items-center justify-between p-2 rounded-xl border ${func.vencimento_aso && isBefore(parseISO(func.vencimento_aso), addDays(new Date(), 30)) ? "bg-destructive/5 border-destructive/20 text-destructive" : "bg-muted/30 border-border/40 text-muted-foreground"}`}>
                                                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle size={12} /> ASO</span>
                                                <span className="text-xs font-black">{func.vencimento_aso ? formatDateBR(func.vencimento_aso) : "N/D"}</span>
                                            </div>
                                            <div className={`flex items-center justify-between p-2 rounded-xl border ${func.vencimento_ferias && isBefore(parseISO(func.vencimento_ferias), addDays(new Date(), 30)) ? "bg-destructive/5 border-destructive/20 text-destructive" : "bg-muted/30 border-border/40 text-muted-foreground"}`}>
                                                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12} /> FÉRIAS</span>
                                                <span className="text-xs font-black">{func.vencimento_ferias ? formatDateBR(func.vencimento_ferias) : "N/D"}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                         </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-border/50">
                        <button onClick={() => handleSaveAction(emp.id)} className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                          <Save size={16} /> Salvar Alterações
                        </button>
                      </div>
                    </>
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
