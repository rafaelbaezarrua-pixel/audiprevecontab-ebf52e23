import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, Save, Users, Building2, FileUp, Settings, Activity, Filter, Gift } from "lucide-react";
import { isBefore, parseISO, addDays } from "date-fns";
import { formatDateBR } from "@/lib/utils";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { usePessoal } from "@/hooks/usePessoal";
import { PessoalRecord } from "@/types/pessoal";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { TaxGuideUploader } from "@/components/TaxGuideUploader";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const PessoalPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const { empresas, loading: empresasLoading } = useEmpresas("pessoal");
  const { pessoalData, loading: pessoalLoading, savePessoalRecord } = usePessoal(competencia);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "todas">("ativas");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [rowTabs, setRowTabs] = useState<Record<string, 'dados' | 'pastas'>>({});
  const [alertsSummary, setAlertsSummary] = useState({ aso: 0, ferias: 0 });
  const [dialogEmpresa, setDialogEmpresa] = useState<any>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      const today = new Date();
      const nextMonth = addDays(today, 30);
      const { data: allFuncs } = await (supabase.from("funcionarios" as any).select("*").eq("ativo", true) as any);
      if (allFuncs) {
        const aso = (allFuncs as any[]).filter(f => f.vencimento_aso && isBefore(parseISO(f.vencimento_aso), nextMonth)).length;
        const ferias = (allFuncs as any[]).filter(f => f.vencimento_ferias && isBefore(parseISO(f.vencimento_ferias), nextMonth)).length;
        setAlertsSummary({ aso, ferias });
      }
    };
    fetchAlerts();
  }, []);

  const filtered = React.useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
      let matchTab = true;
      if (activeTab === "ativas") matchTab = (e.situacao === "ativa" || !e.situacao) && e.porte_empresa !== "mei";
      else if (activeTab === "mei") matchTab = e.situacao === "mei" || (e.porte_empresa === "mei");

      let matchStatus = true;
      if (filterStatus !== "todos") {
        const record = pessoalData[e.id];
        const isAllConcluido = !!record?.dctf_web_gerada;
        matchStatus = filterStatus === 'concluido' ? isAllConcluido : !isAllConcluido;
      }
      return matchSearch && matchTab && matchStatus;
    });
  }, [search, activeTab, filterStatus, empresas, pessoalData]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = (pessoalData[id] || {}) as Partial<PessoalRecord> & Record<string, any>;
    let infoGerais = { forma_envio: "", qtd_funcionarios: 0, qtd_pro_labore: 0, possui_vt: false, possui_va: false, possui_vc: false, possui_vr: false };

    if (!existing.id) {
      const { data: prev } = await supabase.from("pessoal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        infoGerais = { forma_envio: prev[0].forma_envio || "", qtd_funcionarios: prev[0].qtd_funcionarios || 0, qtd_pro_labore: prev[0].qtd_pro_labore || 0, possui_vt: prev[0].possui_vt || false, possui_va: prev[0].possui_va || false, possui_vc: prev[0].possui_vc || false, possui_vr: prev[0].possui_vr || false };
      }
    } else {
      infoGerais = { forma_envio: existing.forma_envio || "", qtd_funcionarios: existing.qtd_funcionarios || 0, qtd_pro_labore: existing.qtd_pro_labore || 0, possui_vt: existing.possui_vt || false, possui_va: existing.possui_va || false, possui_vc: existing.possui_vc || false, possui_vr: existing.possui_vr || false };
    }

    const empresa = empresas.find(e => e.id === id);
    const possuiPontoManual = (empresa as any)?.possui_cartao_ponto || false;

    setEditForm(prev => ({
      ...prev, [id]: {
        ...infoGerais,
        possui_ponto_manual: possuiPontoManual,
        vt_status: existing.vt_status || "pendente", inss_status: existing.inss_status || "pendente", fgts_status: existing.fgts_status || "pendente",
        dctf_web_gerada: existing.dctf_web_gerada || false, dctf_web_data_envio: existing.dctf_web_data_envio || "",
      }
    }));
  };

  const handleSaveAction = async (empresaId: string) => {
    const form = editForm[empresaId];
    try {
      await savePessoalRecord({
        empresa_id: empresaId, competencia,
        forma_envio: form.forma_envio || null,
        qtd_funcionarios: parseInt(String(form.qtd_funcionarios || 0)) || 0,
        qtd_pro_labore: parseInt(String(form.qtd_pro_labore || 0)) || 0,
        possui_vt: !!form.possui_vt, possui_va: !!form.possui_va, possui_vc: !!form.possui_vc, possui_vr: !!form.possui_vr,
        vt_status: form.vt_status || 'pendente',
        vr_status: form.vr_status || 'pendente',
        va_status: form.va_status || 'pendente',
        vc_status: form.vc_status || 'pendente',
        inss_status: form.inss_status, fgts_status: form.fgts_status,
        inss_envio_status: form.inss_envio_status || 'pendente', inss_envio_data: form.inss_envio_data || null,
        fgts_envio_status: form.fgts_envio_status || 'pendente', fgts_envio_data: form.fgts_envio_data || null,
        vt_envio_status: form.vt_envio_status || 'pendente', vt_envio_data: form.vt_envio_data || null,
        vr_envio_status: form.vr_envio_status || 'pendente', vr_envio_data: form.vr_envio_data || null,
        va_envio_status: form.va_envio_status || 'pendente', va_envio_data: form.va_envio_data || null,
        vc_envio_status: form.vc_envio_status || 'pendente', vc_envio_data: form.vc_envio_data || null,
        dctf_web_gerada: !!form.dctf_web_gerada, dctf_web_data_envio: form.dctf_web_data_envio || null,
      });

      if (form.possui_ponto_manual !== undefined) {
        await supabase.from("empresas").update({ possui_cartao_ponto: !!form.possui_ponto_manual }).eq("id", empresaId);
        queryClient.invalidateQueries({ queryKey: ["empresas_modulo"] });
      }
      toast.success("Dados salvos!"); setExpanded(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveParameters = async (empresaId: string, data: any) => {
    try {
      await savePessoalRecord({
        empresa_id: empresaId, competencia,
        forma_envio: data.forma_envio || null,
        qtd_funcionarios: parseInt(String(data.qtd_funcionarios || 0)) || 0,
        qtd_pro_labore: parseInt(String(data.qtd_pro_labore || 0)) || 0,
        possui_vt: !!data.possui_vt, possui_va: !!data.possui_va, possui_vc: !!data.possui_vc, possui_vr: !!data.possui_vr,
      });

      if (data.possui_ponto_manual !== undefined) {
        await supabase.from("empresas").update({ possui_cartao_ponto: !!data.possui_ponto_manual }).eq("id", empresaId);
        queryClient.invalidateQueries({ queryKey: ["empresas_modulo"] });
      }

      toast.success("Parâmetros atualizados!");
      setDialogEmpresa(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const completedCount = React.useMemo(() => {
    return filtered.filter(e => pessoalData[e.id]?.dctf_web_gerada).length;
  }, [filtered, pessoalData]);

  if (empresasLoading || (pessoalLoading && Object.keys(pessoalData).length === 0)) {
    return (<div className="space-y-6"><PageHeaderSkeleton /><TableSkeleton rows={8} /></div>);
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-10 px-1">
      {/* Header Estilo Societário */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Gestão <span className="text-primary/90">Pessoal</span></h1>
            <FavoriteToggleButton moduleId="pessoal" />
          </div>
          <p className="subtitle-premium">Cálculo de folha, pró-labore, benefícios e obrigações mensais.</p>
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
              <span className="text-xl font-black text-rose-500">{alertsSummary.aso + alertsSummary.ferias}</span>
            </div>
          </div>
          <div className="relative flex-1 md:w-[320px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={18} />
            <input type="text" placeholder="BUSCAR POR NOME OU CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 h-14 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl outline-none text-[11px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/20" />
          </div>
        </div>
        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-border/10 shrink-0 h-14 items-center">
          {[{ id: "todos", label: "Geral" }, { id: "pendente", label: "Pendentes" }, { id: "concluido", label: "Enviados" }].map(s => (
            <button key={s.id} onClick={() => setFilterStatus(s.id as any)} className={`px-6 h-full rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterStatus === s.id ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground"}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Navegação por Abas - Estilo Societário */}
      <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-xl border border-border/10 overflow-x-auto no-scrollbar gap-1 w-full">
        {[{ id: "ativas", label: "Empresas Ativas" }, { id: "mei", label: "MEI / SIMEI" }, { id: "todas", label: "Visão Geral" }].map(t => (
          <button key={t.id} className={`px-10 py-3.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === t.id ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground hover:bg-card/30"}`} onClick={() => setActiveTab(t.id as any)}>{t.label}</button>
        ))}
      </div>

      {/* Tabela de Dados - Compacta mas com Estilo Societário */}
      <div className="glass-card !p-0 overflow-hidden border-border/10 shadow-none rounded-xl">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-border/10">
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 min-w-[240px]">Empresas</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Competência</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Folha</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">DCTF Web</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Status</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 pr-8">Opções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {filtered.map(emp => {
                const isOpen = expanded === emp.id;
                const r = pessoalData[emp.id];
                const done = !!r?.dctf_web_gerada;

                return (
                  <React.Fragment key={emp.id}>
                    <tr onClick={() => toggleExpand(emp.id)} className={`group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all ${isOpen ? 'bg-primary/[0.04]' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground shrink-0 border border-border/5"><Users size={22} className="transition-all" /></div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-foreground text-sm uppercase tracking-tight truncate max-w-[280px] leading-none group-hover:text-primary transition-colors">{emp.nome_empresa}</span>
                            <span className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest mt-1.5 opacity-60">CNPJ: {emp.cnpj || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap"><span className="text-muted-foreground/60 font-black text-[10px] uppercase tracking-widest">{competencia}</span></td>
                      <td className="px-6 py-4 text-center whitespace-nowrap"><div className={`inline-block w-3 h-3 rounded-full ${r?.inss_status === 'enviada' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-rose-500/20 border border-rose-500/20'}`} /></td>
                      <td className="px-6 py-4 text-center whitespace-nowrap"><div className={`inline-block w-3 h-3 rounded-full ${done ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-amber-500/20 border border-amber-500/20 animate-pulse'}`} /></td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${done ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {done ? 'CONCLUÍDO' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 pr-8 text-right"><button className={`p-2 rounded-xl border transition-all ${isOpen ? 'bg-primary text-white border-primary rotate-180 shadow-lg' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/40 border-border/10 group-hover:border-primary/50 group-hover:text-primary'}`}><ChevronDown size={14} /></button></td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="px-3 py-4">
                          <div className="bg-card border border-border/50 shadow-inner rounded-2xl p-4 mx-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="max-w-5xl mx-auto space-y-3">
                              <Tabs value={rowTabs[emp.id] || 'dados'} onValueChange={(v) => setRowTabs(prev => ({ ...prev, [emp.id]: v as any }))} className="space-y-3">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/10 pb-3">
                                  <TabsList className="h-10 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                                    <TabsTrigger value="dados" className="px-8 h-full text-[9px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Dados</TabsTrigger>
                                    <TabsTrigger value="config" className="px-8 h-full text-[9px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Parâmetros</TabsTrigger>
                                    <TabsTrigger value="pastas" className="px-8 h-full text-[9px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Documentos</TabsTrigger>
                                  </TabsList>
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => navigate(`/pessoal/funcionarios/${emp.id}`)} className="h-10 px-5 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-3"><Users size={16} /> Gestão de Colaboradores</button>
                                  </div>
                                </div>

                                <TabsContent value="dados" className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300 outline-none">
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    {[
                                      { label: "Funcionários", val: editForm[emp.id]?.qtd_funcionarios || 0 },
                                      { label: "Pró-Labore", val: editForm[emp.id]?.qtd_pro_labore || 0 },
                                      { label: "Forma de Envio", val: editForm[emp.id]?.forma_envio || "NÃO DEF." },
                                      { label: "Ponto Manual", val: (pessoalData[emp.id] as any)?.possui_cartao_ponto ? "SIM" : "NÃO" }
                                    ].map((item, i) => (
                                      <div key={i} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-border/10 shadow-sm group">
                                        <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-1 group-hover:text-primary transition-colors">{item.label}</p>
                                        <p className="text-sm font-black text-foreground uppercase tracking-tight">{item.val}</p>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="bg-white dark:bg-black/10 p-5 rounded-2xl border border-border/10 shadow-sm space-y-6">
                                    {/* CABEÇALHO DO BOX ÚNICO */}
                                    <div className="flex items-center justify-between border-b border-border/5 pb-3">
                                      <div className="flex items-center gap-3">
                                        <Activity className="text-primary" size={20} />
                                        <h4 className="text-[18px] font-black text-foreground uppercase tracking-tight">Fechamento</h4>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${done ? "bg-emerald-500" : "bg-[#ff2d55]"}`} />
                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${done ? "text-emerald-500" : "text-[#ff2d55]"}`}>{done ? "Concluída" : "Pendente"}</span>
                                      </div>
                                    </div>

                                    {/* SEÇÃO 1: PROCESSAMENTO GOVERNO */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">DCTF Web</label>
                                        <select value={editForm[emp.id]?.dctf_web_gerada ? "sim" : "nao"} onChange={e => updateForm(emp.id, "dctf_web_gerada", e.target.value === "sim")} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                          <option value="nao">STATUS: PENDENTE</option>
                                          <option value="sim">STATUS: CONCLUÍDO</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Status INSS</label>
                                        <select value={editForm[emp.id]?.inss_status || "pendente"} onChange={e => updateForm(emp.id, "inss_status", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                          <option value="pendente">PENDENTE</option>
                                          <option value="gerada">GUIA GERADA</option>
                                          <option value="enviada">ENVIADO</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Status FGTS</label>
                                        <select value={editForm[emp.id]?.fgts_status || "pendente"} onChange={e => updateForm(emp.id, "fgts_status", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                          <option value="pendente">PENDENTE</option>
                                          <option value="gerada">GUIA GERADA</option>
                                          <option value="enviada">ENVIADO</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Data Efetivada</label>
                                        <input type="date" value={editForm[emp.id]?.dctf_web_data_envio || ""} onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black focus:ring-1 focus:ring-primary/20 outline-none uppercase" />
                                      </div>
                                    </div>

                                    {/* SEÇÃO 2: GERAÇÃO DE BENEFÍCIOS (DINÂMICO) */}
                                    {(editForm[emp.id]?.possui_vt || editForm[emp.id]?.possui_vr || editForm[emp.id]?.possui_va || editForm[emp.id]?.possui_vc) && (
                                      <div className="space-y-3 pt-1 border-t border-border/5">
                                        <h5 className="text-[9px] font-medium text-primary uppercase tracking-[0.2em]">Benefícios</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                          {editForm[emp.id]?.possui_vt && (
                                            <div className="space-y-1">
                                              <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Status VT</label>
                                              <select value={editForm[emp.id]?.vt_status || "pendente"} onChange={e => updateForm(emp.id, "vt_status", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none cursor-pointer">
                                                <option value="pendente">PENDENTE</option>
                                                <option value="gerada">GUIA GERADA</option>
                                                <option value="enviada">ENVIADO</option>
                                              </select>
                                            </div>
                                          )}
                                          {editForm[emp.id]?.possui_vr && (
                                            <div className="space-y-1">
                                              <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Status VR</label>
                                              <select value={editForm[emp.id]?.vr_status || "pendente"} onChange={e => updateForm(emp.id, "vr_status", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none cursor-pointer">
                                                <option value="pendente">PENDENTE</option>
                                                <option value="gerada">GUIA GERADA</option>
                                                <option value="enviada">ENVIADO</option>
                                              </select>
                                            </div>
                                          )}
                                          {editForm[emp.id]?.possui_va && (
                                            <div className="space-y-1">
                                              <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Status VA</label>
                                              <select value={editForm[emp.id]?.va_status || "pendente"} onChange={e => updateForm(emp.id, "va_status", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none cursor-pointer">
                                                <option value="pendente">PENDENTE</option>
                                                <option value="gerada">GUIA GERADA</option>
                                                <option value="enviada">ENVIADO</option>
                                              </select>
                                            </div>
                                          )}
                                          {editForm[emp.id]?.possui_vc && (
                                            <div className="space-y-1">
                                              <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Status VC</label>
                                              <select value={editForm[emp.id]?.vc_status || "pendente"} onChange={e => updateForm(emp.id, "vc_status", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none cursor-pointer">
                                                <option value="pendente">PENDENTE</option>
                                                <option value="gerada">GUIA GERADA</option>
                                                <option value="enviada">ENVIADO</option>
                                              </select>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* SEÇÃO 3: ENVIO PARA O CLIENTE */}
                                    <div className="space-y-4 pt-1 border-t border-border/5">
                                      <h5 className="text-[9px] font-medium text-primary uppercase tracking-[0.2em]">Envio para o Cliente</h5>

                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                                        {/* GRUPO INSS */}
                                        <div className="space-y-1.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/10">
                                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Guia INSS</p>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Status</label>
                                              <select value={editForm[emp.id]?.inss_envio_status || "pendente"} onChange={e => updateForm(emp.id, "inss_envio_status", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black uppercase outline-none">
                                                <option value="pendente">PENDENTE</option>
                                                <option value="enviado">ENVIADO</option>
                                              </select>
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Data</label>
                                              <input type="date" value={editForm[emp.id]?.inss_envio_data || ""} onChange={e => updateForm(emp.id, "inss_envio_data", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black outline-none" />
                                            </div>
                                          </div>
                                        </div>

                                        {/* GRUPO FGTS */}
                                        <div className="space-y-1.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/10">
                                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Guia FGTS</p>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Status</label>
                                              <select value={editForm[emp.id]?.fgts_envio_status || "pendente"} onChange={e => updateForm(emp.id, "fgts_envio_status", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black uppercase outline-none">
                                                <option value="pendente">PENDENTE</option>
                                                <option value="enviado">ENVIADO</option>
                                              </select>
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Data</label>
                                              <input type="date" value={editForm[emp.id]?.fgts_envio_data || ""} onChange={e => updateForm(emp.id, "fgts_envio_data", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black outline-none" />
                                            </div>
                                          </div>
                                        </div>

                                        {/* GRUPO VT */}
                                        {editForm[emp.id]?.possui_vt && (
                                          <div className="space-y-1.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/10">
                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Guia VT</p>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="space-y-1">
                                                <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Status</label>
                                                <select value={editForm[emp.id]?.vt_envio_status || "pendente"} onChange={e => updateForm(emp.id, "vt_envio_status", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black uppercase outline-none">
                                                  <option value="pendente">PENDENTE</option>
                                                  <option value="enviado">ENVIADO</option>
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Data</label>
                                                <input type="date" value={editForm[emp.id]?.vt_envio_data || ""} onChange={e => updateForm(emp.id, "vt_envio_data", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black outline-none" />
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* GRUPO VR */}
                                        {editForm[emp.id]?.possui_vr && (
                                          <div className="space-y-1.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/10">
                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Guia VR</p>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="space-y-1">
                                                <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Status</label>
                                                <select value={editForm[emp.id]?.vr_envio_status || "pendente"} onChange={e => updateForm(emp.id, "vr_envio_status", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black uppercase outline-none">
                                                  <option value="pendente">PENDENTE</option>
                                                  <option value="enviado">ENVIADO</option>
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Data</label>
                                                <input type="date" value={editForm[emp.id]?.vr_envio_data || ""} onChange={e => updateForm(emp.id, "vr_envio_data", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black outline-none" />
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* GRUPO VA */}
                                        {editForm[emp.id]?.possui_va && (
                                          <div className="space-y-1.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/10">
                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Guia VA</p>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="space-y-1">
                                                <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Status</label>
                                                <select value={editForm[emp.id]?.va_envio_status || "pendente"} onChange={e => updateForm(emp.id, "va_status_envio", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black uppercase outline-none">
                                                  <option value="pendente">PENDENTE</option>
                                                  <option value="enviado">ENVIADO</option>
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Data</label>
                                                <input type="date" value={editForm[emp.id]?.va_envio_data || ""} onChange={e => updateForm(emp.id, "va_envio_data", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black outline-none" />
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* GRUPO VC */}
                                        {editForm[emp.id]?.possui_vc && (
                                          <div className="space-y-1.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/10">
                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Guia VC</p>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="space-y-1">
                                                <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Status</label>
                                                <select value={editForm[emp.id]?.vc_envio_status || "pendente"} onChange={e => updateForm(emp.id, "vc_envio_status", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black uppercase outline-none">
                                                  <option value="pendente">PENDENTE</option>
                                                  <option value="enviado">ENVIADO</option>
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest ml-0.5">Data</label>
                                                <input type="date" value={editForm[emp.id]?.vc_envio_data || ""} onChange={e => updateForm(emp.id, "vc_envio_data", e.target.value)} className="w-full h-10 px-2 rounded-md border border-border/10 bg-black/10 dark:bg-white/5 text-[9px] font-black outline-none" />
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* BOTÃO SALVAR INTEGRADO NO BOX */}
                                    <div className="flex justify-end pt-2">
                                      <button onClick={() => handleSaveAction(emp.id)} className="h-10 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center gap-3 transition-all shadow-lg active:scale-95">
                                        <Save size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Salvar Fechamento</span>
                                      </button>
                                    </div>
                                  </div>
                                </TabsContent>

                                <TabsContent value="config" className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 outline-none">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="space-y-1.5">
                                      <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Equipe Funcionários</label>
                                      <input type="number" value={editForm[emp.id]?.qtd_funcionarios || 0} onChange={e => updateForm(emp.id, "qtd_funcionarios", parseInt(e.target.value) || 0)} className="w-full h-10 px-4 rounded-lg border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Equipe Pró-Labore</label>
                                      <input type="number" value={editForm[emp.id]?.qtd_pro_labore || 0} onChange={e => updateForm(emp.id, "qtd_pro_labore", parseInt(e.target.value) || 0)} className="w-full h-10 px-4 rounded-lg border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Forma de Envio</label>
                                      <input value={editForm[emp.id]?.forma_envio || ""} onChange={e => updateForm(emp.id, "forma_envio", e.target.value)} className="w-full h-10 px-4 rounded-lg border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase" placeholder="WhatsApp..." />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Ponto Manual</label>
                                      <select value={editForm[emp.id]?.possui_ponto_manual ? "sim" : "nao"} onChange={e => updateForm(emp.id, "possui_ponto_manual", e.target.value === "sim")} className="w-full h-10 px-4 rounded-lg border border-border/10 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase">
                                        <option value="nao">Não Utiliza</option>
                                        <option value="sim">Sim, Requerido</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border/5 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Gift size={14} className="text-primary" />
                                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground">Benefícios</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {[
                                        { id: 'possui_vt', label: 'VT' },
                                        { id: 'possui_vr', label: 'VR' },
                                        { id: 'possui_va', label: 'VA' },
                                        { id: 'possui_vc', label: 'VC' }
                                      ].map(b => (
                                        <div key={b.id} className="flex items-center justify-between p-2.5 bg-card rounded-lg border border-border/10 group/ben">
                                          <span className="text-[10px] font-black uppercase text-muted-foreground group-hover/ben:text-primary transition-colors">{b.label}</span>
                                          <button onClick={() => updateForm(emp.id, b.id, !editForm[emp.id]?.[b.id])} className={`w-8 h-4 rounded-full relative transition-all ${editForm[emp.id]?.[b.id] ? 'bg-emerald-500' : 'bg-muted-foreground/20'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${editForm[emp.id]?.[b.id] ? 'left-4.5' : 'left-0.5'}`} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex justify-end pt-2">
                                    <button onClick={() => handleSaveAction(emp.id)} className="h-10 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center gap-3 transition-all shadow-lg group">
                                      <Save size={16} className="group-hover:scale-110 transition-transform" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Salvar Parâmetros</span>
                                    </button>
                                  </div>
                                </TabsContent>

                                <TabsContent value="pastas" className="animate-in slide-in-from-right-4 duration-500 outline-none">
                                  <ModuleFolderView empresa={emp} departamentoId="pessoal" />
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
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 border-dashed border-border/10 opacity-60">
              <Activity size={48} className="text-muted-foreground/20 mb-4" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">Nenhuma empresa localizada nesta categoria</p>
            </div>
          )}
        </div>
      </div>

      {isUploaderOpen && <TaxGuideUploader empresas={empresas} onClose={() => setIsUploaderOpen(false)} onConfirm={() => queryClient.invalidateQueries({ queryKey: ["pessoal"] })} competenciaFiltro={competencia} />}
    </div>
  );
};

export default PessoalPage;
