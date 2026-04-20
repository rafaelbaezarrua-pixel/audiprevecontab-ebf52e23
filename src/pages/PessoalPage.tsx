import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, Save, Users, Building2, FileUp, Settings, Activity, Filter, Gift } from "lucide-react";
import { isBefore, parseISO, addDays } from "date-fns";
import { formatDateBR, formatMonthYearBR, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { usePessoal } from "@/hooks/usePessoal";
import { PessoalRecord } from "@/types/pessoal";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { TaxGuideUploader } from "@/components/TaxGuideUploader";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmpresaAccordion } from "@/components/EmpresaAccordion";

const PessoalPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const { empresas, loading: empresasLoading } = useEmpresas("pessoal");
  const { pessoalData, loading: pessoalLoading, savePessoalRecord } = usePessoal(competencia);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "todas" | "folha" | "prolabore">("folha");
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
      else if (activeTab === "folha") matchTab = (e as any).possui_funcionarios === true;
      else if (activeTab === "prolabore") matchTab = (e as any).somente_pro_labore === true;

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
    let infoGerais = { forma_envio: "", qtd_funcionarios: 0, qtd_pro_labore: 0, possui_vt: false, possui_va: false, possui_vc: false };

    if (!existing.id) {
      const { data: prev } = await supabase.from("pessoal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        infoGerais = { forma_envio: prev[0].forma_envio || "", qtd_funcionarios: prev[0].qtd_funcionarios || 0, qtd_pro_labore: prev[0].qtd_pro_labore || 0, possui_vt: prev[0].possui_vt || false, possui_va: prev[0].possui_va || false, possui_vc: prev[0].possui_vc || false };
      }
    } else {
      infoGerais = { forma_envio: existing.forma_envio || "", qtd_funcionarios: existing.qtd_funcionarios || 0, qtd_pro_labore: existing.qtd_pro_labore || 0, possui_vt: existing.possui_vt || false, possui_va: existing.possui_va || false, possui_vc: existing.possui_vc || false };
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
        possui_vt: !!form.possui_vt, possui_va: !!form.possui_va, possui_vc: !!form.possui_vc,
        vt_status: form.vt_status || 'pendente',
        va_status: form.va_status || 'pendente',
        vc_status: form.vc_status || 'pendente',
        inss_status: form.inss_status, fgts_status: form.fgts_status,
        inss_data_envio: form.inss_envio_data || null,
        fgts_data_envio: form.fgts_envio_data || null,
        vt_data_envio: form.vt_envio_data || null,
        va_data_envio: form.va_envio_data || null,
        vc_data_envio: form.vc_envio_data || null,
        dctf_web_gerada: !!form.dctf_web_gerada,
      });

      if (form.possui_ponto_manual !== undefined) {
        await (supabase.from("empresas").update({ possui_cartao_ponto: !!form.possui_ponto_manual } as any) as any).eq("id", empresaId);
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
        possui_vt: !!data.possui_vt, possui_va: !!data.possui_va, possui_vc: !!data.possui_vc,
      });

      if (data.possui_ponto_manual !== undefined) {
        await (supabase.from("empresas").update({ possui_cartao_ponto: !!data.possui_ponto_manual } as any) as any).eq("id", empresaId);
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
    <div className="animate-fade-in relative pb-10">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      <div className="space-y-6">
        {/* Header Estilo Societário Compact */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-0">
          <div className="space-y-1 -mt-2">
            <div className="flex items-center gap-2">
              <h1 className="header-title">Gestão <span className="text-primary/90 font-black">Pessoal</span></h1>
              <FavoriteToggleButton moduleId="pessoal" />
            </div>
            <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm">Folha, pró-labore, benefícios e obrigações mensais.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={() => setIsUploaderOpen(true)} className="flex items-center gap-2 px-4 h-10 bg-black/10 dark:bg-white/5 text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all font-black text-[11px] border border-border/10 shadow-inner">
              <FileUp size={16} /> <span>Processar Guias</span>
            </button>
            <div className="flex items-center gap-3 px-4 h-10 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl shadow-inner">
              <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="bg-transparent border-none focus:ring-0 text-[12px] font-bold outline-none text-right h-full text-foreground cursor-pointer w-24" />
            </div>
          </div>
        </div>

        {/* Stats & Search Bar - Estilo Societário Compact */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl overflow-hidden h-12 shrink-0 p-0.5 shadow-inner">
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[10px] text-foreground font-black uppercase tracking-wider mb-0.5">Empresas</span>
                <span className="text-[15px] font-black leading-none">{filtered.length}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[10px] text-primary font-black uppercase tracking-wider mb-0.5">OK</span>
                <span className="text-[15px] font-black text-primary leading-none">{completedCount}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center">
                <span className="text-[10px] text-rose-500 font-black uppercase tracking-wider mb-0.5">Alertas</span>
                <span className="text-[15px] font-black text-rose-500 leading-none">{alertsSummary.aso + alertsSummary.ferias}</span>
              </div>
            </div>
            <div className="relative flex-1 md:w-[280px] group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-colors" size={16} />
              <input type="text" placeholder="PROCURAR EMPRESA..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 h-12 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl outline-none text-[12px] font-black uppercase focus:ring-1 focus:ring-primary/20 transition-all placeholder:opacity-40 shadow-inner" />
            </div>
          </div>
          <div className="flex bg-black/10 dark:bg-white/5 p-0.5 rounded-xl border border-border/10 shrink-0 h-12 items-center shadow-inner">
            {[{ id: "todos", label: "Geral" }, { id: "pendente", label: "Pendentes" }, { id: "concluido", label: "Enviados" }].map(s => (
              <button key={s.id} onClick={() => setFilterStatus(s.id as any)} className={`px-5 h-full rounded-lg text-[11px] font-black uppercase transition-all whitespace-nowrap ${filterStatus === s.id ? "bg-card text-primary shadow-sm" : "text-foreground hover:text-foreground hover:bg-card/20"}`}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Navegação por Abas - Estilo Societário Compact */}
        <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 overflow-x-auto no-scrollbar gap-1 w-full shadow-inner">
          {[{ id: "folha", label: "Somente Folha" }, { id: "prolabore", label: "Somente Pró-labore" }].map(t => (
            <button key={t.id} className={`flex-1 py-3 px-4 rounded-lg text-[12px] font-black uppercase transition-all whitespace-nowrap ${activeTab === t.id ? "bg-card text-primary shadow-sm" : "text-foreground hover:text-foreground hover:bg-card/20"}`} onClick={() => { setActiveTab(t.id as any); setExpanded(null); }}>{t.label}</button>
          ))}
        </div>

        <div className="bg-black/[0.03] dark:bg-white/[0.02] border border-border/10 rounded-[2.5rem] shadow-inner p-1 pb-4 relative">
        {/* Tabela de Dados -> Agora Accordions com Cabeçalho Rico */}
        <div className="hidden md:grid grid-cols-[2.5fr_1fr_80px_100px_1.2fr_60px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-0 relative z-20">
          <span>Empresas</span>
          <span className="text-center">Competência</span>
          <span className="text-center">Folha</span>
          <span className="text-center">DCTF Web</span>
          <span className="text-center">Status</span>
          <span className="text-right pr-2">Opções</span>
        </div>

        <div className="space-y-3 px-1 relative z-10">
            {filtered.map(emp => {
            const isOpen = expanded === emp.id;
            const r = pessoalData[emp.id];
            const done = !!r?.dctf_web_gerada;

            // Lógica para indicadores do cabeçalho
            const hasFolhaOk = r?.inss_status === "enviada" || r?.inss_status === "gerada" || r?.fgts_status === "enviada" || r?.fgts_status === "gerada";

            const customHeader = (
              <div className="md:grid md:grid-cols-[2.5fr_1fr_80px_100px_1.2fr_60px] items-center w-full py-1">
                {/* Empresa */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 border",
                    isOpen ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-black/5 dark:bg-white/5 border-border/10 group-hover:border-primary/20"
                  )}>
                    <Users size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      "font-black text-[13px] uppercase tracking-tight truncate transition-colors",
                      isOpen ? "text-primary" : "text-foreground group-hover:text-primary"
                    )}>
                      {emp.nome_empresa}
                    </span>
                    <span className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest">
                      CNPJ: {emp.cnpj}
                    </span>
                  </div>
                </div>

                {/* Competência */}
                <div className="hidden md:block text-center text-[11px] font-black text-muted-foreground/80 font-mono">
                  {formatMonthYearBR(competencia)}
                </div>

                {/* Folha (Dot) */}
                <div className="hidden md:flex justify-center">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full border shadow-sm",
                    hasFolhaOk ? "bg-emerald-500 border-emerald-600/20 shadow-emerald-500/20" : "bg-rose-400/30 border-rose-400/20 shadow-rose-400/10"
                  )} />
                </div>

                {/* DCTF Web (Dot) */}
                <div className="hidden md:flex justify-center">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full border shadow-sm",
                    done ? "bg-emerald-500 border-emerald-600/20 shadow-emerald-500/20" : "bg-rose-400/30 border-rose-400/20 shadow-rose-400/10"
                  )} />
                </div>

                {/* Status (Pill) */}
                <div className="hidden md:flex justify-center">
                  <span className={cn(
                    "px-4 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm",
                    done ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  )}>
                    {done ? "CONCLUÍDO" : "PENDENTE"}
                  </span>
                </div>

                {/* Opções */}
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
                icon={<Users size={18} />}
                nome_empresa={emp.nome_empresa}
              >
                <div className="max-w-6xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Tabs value={rowTabs[emp.id] || 'dados'} onValueChange={(v) => setRowTabs(prev => ({ ...prev, [emp.id]: v as any }))} className="space-y-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-border/5 pb-3">
                      <TabsList className="h-10 bg-black/10 dark:bg-white/10 p-1 rounded-lg shadow-inner">
                        <TabsTrigger value="dados" className="px-6 h-full text-[11px] font-black uppercase data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Painel</TabsTrigger>
                        <TabsTrigger value="config" className="px-6 h-full text-[11px] font-black uppercase data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Parâmetros</TabsTrigger>
                        <TabsTrigger value="pastas" className="px-6 h-full text-[11px] font-black uppercase data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Arquivos</TabsTrigger>
                      </TabsList>
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/pessoal/funcionarios/${emp.id}`)} className="h-9 px-4 text-[11px] font-black uppercase text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-lg transition-all flex items-center gap-2 shadow-sm"><Users size={14} /> Colaboradores</button>
                      </div>
                    </div>

                    <TabsContent value="dados" className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200 outline-none">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                        {[
                          { label: "Funcionários", val: editForm[emp.id]?.qtd_funcionarios || 0 },
                          { label: "Pró-Labore", val: editForm[emp.id]?.qtd_pro_labore || 0 },
                          { label: "Forma Envio", val: editForm[emp.id]?.forma_envio || "N/D" },
                          { label: "Cartão Ponto", val: (pessoalData[emp.id] as any)?.possui_cartao_ponto ? "ATIVO" : "NÃO" }
                        ].map((item, i) => (
                          <div key={i} className="bg-card p-3 rounded-xl border border-border/10 shadow-sm transition-all hover:border-primary/20 group/input">
                            <p className="text-[10px] font-black text-foreground uppercase mb-1 group-hover:text-primary transition-colors tracking-widest">{item.label}</p>
                            <p className="text-[13px] font-black text-foreground uppercase tracking-tight">{item.val}</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-card p-4 rounded-2xl border border-border/10 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-border/5 pb-3">
                          <div className="flex items-center gap-2">
                            <Activity className="text-primary" size={16} />
                            <h4 className="text-[12px] font-black text-foreground uppercase tracking-widest">Fechamento Mensal</h4>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">DCTF Web</label>
                            <select value={editForm[emp.id]?.dctf_web_gerada ? "sim" : "nao"} onChange={e => updateForm(emp.id, "dctf_web_gerada", e.target.value === "sim")} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer shadow-inner">
                              <option value="nao">PENDENTE</option>
                              <option value="sim">OK (CONCLUÍDO)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Status INSS</label>
                            <select value={editForm[emp.id]?.inss_status || "pendente"} onChange={e => updateForm(emp.id, "inss_status", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer shadow-inner">
                              <option value="pendente">PENDENTE</option>
                              <option value="gerada">GUIA OK</option>
                              <option value="enviada">ENVIADO</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Status FGTS</label>
                            <select value={editForm[emp.id]?.fgts_status || "pendente"} onChange={e => updateForm(emp.id, "fgts_status", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer shadow-inner">
                              <option value="pendente">PENDENTE</option>
                              <option value="gerada">GUIA OK</option>
                              <option value="enviada">ENVIADO</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Data Proc.</label>
                            <input type="date" value={editForm[emp.id]?.dctf_web_data_envio || ""} onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black focus:ring-1 focus:ring-primary/20 outline-none uppercase shadow-inner" />
                          </div>
                        </div>

                        {(editForm[emp.id]?.possui_vt || editForm[emp.id]?.possui_vr || editForm[emp.id]?.possui_va || editForm[emp.id]?.possui_vc) && (
                          <div className="space-y-3 pt-3 border-t border-border/5">
                            <h5 className="text-[10px] font-black text-primary uppercase tracking-widest">Controle de Benefícios</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {editForm[emp.id]?.possui_vt && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">VT</label>
                                  <select value={editForm[emp.id]?.vt_status || "pendente"} onChange={e => updateForm(emp.id, "vt_status", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 text-[11px] font-black uppercase outline-none shadow-inner">
                                    <option value="pendente">ABERTO</option>
                                    <option value="gerada">GERADO</option>
                                    <option value="enviada">OK</option>
                                  </select>
                                </div>
                              )}
                              {editForm[emp.id]?.possui_vr && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">VR</label>
                                  <select value={editForm[emp.id]?.vr_status || "pendente"} onChange={e => updateForm(emp.id, "vr_status", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 text-[11px] font-black uppercase outline-none shadow-inner">
                                    <option value="pendente">ABERTO</option>
                                    <option value="gerada">GERADO</option>
                                    <option value="enviada">OK</option>
                                  </select>
                                </div>
                              )}
                              {editForm[emp.id]?.possui_va && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">VA</label>
                                  <select value={editForm[emp.id]?.va_status || "pendente"} onChange={e => updateForm(emp.id, "va_status", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 text-[11px] font-black uppercase outline-none shadow-inner">
                                    <option value="pendente">ABERTO</option>
                                    <option value="gerada">GERADO</option>
                                    <option value="enviada">OK</option>
                                  </select>
                                </div>
                              )}
                              {editForm[emp.id]?.possui_vc && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">VC</label>
                                  <select value={editForm[emp.id]?.vc_status || "pendente"} onChange={e => updateForm(emp.id, "vc_status", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 text-[11px] font-black uppercase outline-none shadow-inner">
                                    <option value="pendente">ABERTO</option>
                                    <option value="gerada">GERADO</option>
                                    <option value="enviada">OK</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-border/5">
                          <button onClick={() => handleSaveAction(emp.id)} className="h-10 px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center gap-2 transition-all shadow-lg active:scale-95 group">
                            <Save size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Confirmar Fechamento</span>
                          </button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="config" className="space-y-4 animate-in fade-in slide-in-from-right-1 duration-200 outline-none">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Funcionários</label>
                          <input type="number" value={editForm[emp.id]?.qtd_funcionarios || 0} onChange={e => updateForm(emp.id, "qtd_funcionarios", parseInt(e.target.value) || 0)} className="w-full h-10 px-3 rounded-xl border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black shadow-inner" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Pró-Labore</label>
                          <input type="number" value={editForm[emp.id]?.qtd_pro_labore || 0} onChange={e => updateForm(emp.id, "qtd_pro_labore", parseInt(e.target.value) || 0)} className="w-full h-10 px-3 rounded-xl border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black shadow-inner" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Forma de Envio</label>
                          <input value={editForm[emp.id]?.forma_envio || ""} onChange={e => updateForm(emp.id, "forma_envio", e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black uppercase shadow-inner" placeholder="WHATSAPP..." />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Ponto Manual</label>
                          <select value={editForm[emp.id]?.possui_ponto_manual ? "sim" : "nao"} onChange={e => updateForm(emp.id, "possui_ponto_manual", e.target.value === "sim")} className="w-full h-10 px-3 rounded-xl border border-border/10 bg-black/10 dark:bg-white/5 text-[11px] font-black uppercase shadow-inner">
                            <option value="nao">NÃO UTILIZA</option>
                            <option value="sim">SIM, REQUERIDO</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-card p-4 rounded-2xl border border-border/10 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Gift size={14} className="text-primary" />
                          <span className="text-[11px] font-black uppercase text-foreground tracking-widest">Benefícios</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { id: 'possui_vt', label: 'Vale Transporte' },
                            { id: 'possui_vr', label: 'Vale Refeição' },
                            { id: 'possui_va', label: 'Vale Alimentação' },
                            { id: 'possui_vc', label: 'Vale Combustível' }
                          ].map(b => (
                            <div key={b.id} className="flex items-center justify-between p-3 bg-black/5 rounded-xl border border-border/5 group/ben shadow-inner">
                              <span className="text-[10px] font-black uppercase text-foreground group-hover/ben:text-primary transition-colors tracking-widest">{b.label}</span>
                              <button onClick={() => updateForm(emp.id, b.id, !editForm[emp.id]?.[b.id])} className={`w-8 h-4 rounded-full relative transition-all ${editForm[emp.id]?.[b.id] ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.3)]' : 'bg-black/20'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${editForm[emp.id]?.[b.id] ? 'left-4.5' : 'left-0.5'}`} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end pt-2 border-t border-border/5">
                          <button onClick={() => handleSaveAction(emp.id)} className="h-10 px-10 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95">Salvar Parâmetros</button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="pastas" className="animate-in slide-in-from-right-1 duration-200 outline-none h-[400px] overflow-hidden bg-black/5 rounded-xl border border-dashed border-border/10 p-0.5 shadow-inner">
                      <div className="h-full overflow-hidden rounded-lg">
                        <ModuleFolderView empresa={emp} departamentoId="pessoal" />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </EmpresaAccordion>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-black/[0.02] dark:bg-white/[0.01] rounded-xl border border-dashed border-border/10">
              <Activity size={32} className="text-muted-foreground/20 mb-3" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nenhuma empresa localizada</p>
            </div>
          )}
        </div>

        {isUploaderOpen && (
          <TaxGuideUploader
            empresas={empresas}
            onClose={() => setIsUploaderOpen(false)}
            onConfirm={() => queryClient.invalidateQueries({ queryKey: ["pessoal"] })}
            competenciaFiltro={competencia}
          />
        )}
          </div>
        </div>
      </div>
  );
};

export default PessoalPage;
