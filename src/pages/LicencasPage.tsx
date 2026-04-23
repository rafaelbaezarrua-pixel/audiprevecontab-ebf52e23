import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR, cn } from "@/lib/utils";
import {
  Search, Building2, ChevronDown, ChevronUp,
  Shield, CheckCircle, Clock, AlertTriangle, Save,
  Upload, Eye, FileText, FolderOpen, Activity, Plus, Settings
} from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { LicencaRecord, LicencaTaxaRecord, GuiaStatus } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmpresaAccordion } from "@/components/EmpresaAccordion";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";

const licencaLabels: Record<string, string> = {
  alvara: "Alvará de Funcionamento",
  vigilancia_sanitaria: "Vigilância Sanitária",
  corpo_bombeiros: "Corpo de Bombeiros",
  meio_ambiente: "Meio Ambiente"
};

const tipoStatusLabels: Record<string, { label: string; cls: string }> = {
  definitiva: { label: "Definitiva", cls: "badge-success" },
  dispensada: { label: "Dispensada", cls: "badge-gray" },
  com_vencimento: { label: "Com Vencimento", cls: "badge-warning" },
  em_processo: { label: "Em Processo", cls: "badge-info" },
};

const calcDias = (data?: string | null) => {
  if (!data) return 999;
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
};

type TabType = "licencas" | "taxas";

const LicencasPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("licencas");
  const [licencas, setLicencas] = useState<LicencaRecord[]>([]);
  const [taxas, setTaxas] = useState<LicencaTaxaRecord[]>([]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("licencas");
  const [activeStatusTab, setActiveStatusTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [taxasForm, setTaxasForm] = useState<Record<string, Record<string, Partial<LicencaTaxaRecord>>>>({});
  const [licencasForm, setLicencasForm] = useState<Record<string, Record<string, Partial<LicencaRecord>>>>({});
  const [isConsultandoGuia, setIsConsultandoGuia] = useState<string | null>(null);

  const licByEmpresa = (id: string) => licencas.filter(l => l.empresa_id === id);

  const loadBaseData = async () => {
    const { data: lics } = await supabase.from("licencas").select("*");
    const licList = (lics as unknown as LicencaRecord[]) || [];
    setLicencas(licList);

    // Initialize lic form
    const map: Record<string, Record<string, Partial<LicencaRecord>>> = {};
    licList.forEach(l => {
      if (!map[l.empresa_id]) map[l.empresa_id] = {};
      map[l.empresa_id][l.tipo_licenca] = {
        id: l.id,
        status: l.status,
        vencimento: l.vencimento,
        numero_processo: l.numero_processo
      };
    });
    setLicencasForm(map);
  };

  const loadTaxas = async () => {
    const { data } = await supabase.from("licencas_taxas").select("*").eq("competencia", competencia);
    setTaxas((data as unknown as LicencaTaxaRecord[]) || []);

    // Auto-populate edit form with fetched data
    const map: Record<string, Record<string, Partial<LicencaTaxaRecord>>> = {};
    (data as unknown as LicencaTaxaRecord[])?.forEach(t => {
      if (!map[t.empresa_id]) map[t.empresa_id] = {};
      map[t.empresa_id][t.tipo_licenca] = {
        id: t.id,
        status: t.status,
        data_envio: t.data_envio,
        forma_envio: t.forma_envio,
        data_vencimento: t.data_vencimento
      };
    });
    setTaxasForm(map);
  };

  useEffect(() => { loadBaseData(); }, []);
  useEffect(() => { if (activeTab === "taxas") loadTaxas(); }, [competencia, activeTab]);

  // Unify filtering
  const filtered = React.useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);

      let matchTab = false;
      if (activeStatusTab === "ativas") {
        matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa !== "mei";
      } else if (activeStatusTab === "mei") {
        matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa === "mei";
      } else if (activeStatusTab === "paralisadas") {
        matchTab = e.situacao === "paralisada";
      } else if (activeStatusTab === "baixadas") {
        matchTab = e.situacao === "baixada";
      } else if (activeStatusTab === "entregue") {
        matchTab = e.situacao === "entregue";
      }

      if (activeTab === "taxas") {
        const hasAnyLicence = licByEmpresa(e.id).length > 0;
        if (!hasAnyLicence) return false;
      }

      let matchFilterStatus = true;
      if (activeTab === "licencas" && filterStatus !== "todos") {
        matchFilterStatus = licByEmpresa(e.id).some((l: LicencaRecord) => l.status === filterStatus);
      }

      return matchSearch && matchTab && matchFilterStatus;
    });
  }, [empresas, search, activeStatusTab, activeTab, filterStatus, licencas]);

  const stats = React.useMemo(() => {
    if (activeTab === "licencas") {
      const total = filtered.length;
      const ok = filtered.filter(e => {
        const lics = licByEmpresa(e.id);
        return lics.length > 0 && lics.every(l => l.status === "definitiva" || l.status === "dispensada");
      }).length;
      return { total, ok, alerts: total - ok };
    } else {
      const total = filtered.length;
      const ok = filtered.filter(e => {
        const tForm = taxasForm[e.id];
        if (!tForm) return false;
        const licTypes = licByEmpresa(e.id).map(l => l.tipo_licenca);
        return licTypes.every(type => tForm[type]?.status === "enviada");
      }).length;
      return { total, ok, alerts: total - ok };
    }
  }, [filtered, activeTab, licencas, taxasForm]);

  // --- Handlers for Taxas Tab ---
  const handleTaxaChange = (empresaId: string, tipoLicenca: string, field: string, value: string | GuiaStatus | null) => {
    setTaxasForm(prev => {
      const empData = prev[empresaId] || {};
      const licData = empData[tipoLicenca] || { status: 'pendente', data_envio: '', forma_envio: '' };
      return {
        ...prev,
        [empresaId]: {
          ...empData,
          [tipoLicenca]: { ...licData, [field]: value }
        }
      }
    });
  };

  const saveTaxas = async (empresaId: string) => {
    const empTaxas = taxasForm[empresaId];
    if (!empTaxas) return;

    try {
      const promises = Object.keys(licencaLabels).map(async (tipoLicenca) => {
        const data = empTaxas[tipoLicenca];
        if (!data) return; // Only save those modified/existing in form state

        const payload = {
          empresa_id: empresaId,
          tipo_licenca: tipoLicenca,
          competencia,
          status: data.status || 'pendente',
          data_envio: data.data_envio || null,
          forma_envio: data.forma_envio || null,
          data_vencimento: data.data_vencimento || null
        };

        if (data.id) {
          return supabase.from("licencas_taxas").update(payload).eq("id", data.id);
        } else {
          return supabase.from("licencas_taxas").insert(payload);
        }
      });

      await Promise.all(promises);
      toast.success("Taxas atualizadas com sucesso!");
      loadTaxas(); // Reload to get newly inserted IDs
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar as taxas.");
    }
  };

  const handleLicencaDataChange = (empresaId: string, tipoLicenca: string, field: string, value: string | null) => {
    setLicencasForm(prev => {
      const empData = prev[empresaId] || {};
      const licData = empData[tipoLicenca] || { status: null, vencimento: null, numero_processo: null };
      return {
        ...prev,
        [empresaId]: {
          ...empData,
          [tipoLicenca]: { ...licData, [field]: value }
        }
      }
    });
  };

  const saveLicencasData = async (empresaId: string) => {
    const empLics = licencasForm[empresaId];
    if (!empLics) return;

    try {
      const promises = Object.keys(licencaLabels).map(async (tipoLicenca) => {
        const data = empLics[tipoLicenca];
        if (!data) return;

        const payload = {
          empresa_id: empresaId,
          tipo_licenca: tipoLicenca,
          status: data.status || null,
          vencimento: data.vencimento || null,
          numero_processo: data.numero_processo || null
        };

        if (data.id) {
          return supabase.from("licencas").update(payload).eq("id", data.id);
        } else if (data.status) {
          // Only insert if it has a status
          return supabase.from("licencas").insert(payload);
        }
      });

      await Promise.all(promises);
      toast.success("Licenças atualizadas com sucesso!");
      loadBaseData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar as licenças.");
    }
  };

  const handleConsultarGuiaAlvara = async (cnpj: string | null | undefined) => {
    if (!cnpj) {
      toast.error("CNPJ não encontrado para esta empresa.");
      return;
    }

    setIsConsultandoGuia(cnpj);
    const toastId = toast.loading("Consultando guias no portal da prefeitura (Betha)...", { duration: 30000 });

    try {
      // Endpoint that will run the headless browser script
      // Note: In Vercel, this serverless function requires puppeteer-core and @sparticuz/chromium
      const res = await fetch('/api/consultar-guia-alvara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj }),
      });

      if (!res.ok) {
        let errMessage = "Ocorreu um erro no servidor.";
        try { const errObj = await res.json(); errMessage = errObj.error || errMessage; } catch (e) { /* ignore json parse error */ }
        throw new Error(errMessage);
      }

      const blob = await res.blob();
      if (blob.size === 0) throw new Error("Documento vazio retornado.");

      // Create a link and click it to download the file directly, not saving to DB
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Guias_Alvara_${cnpj.replace(/\D/g, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Guias baixadas com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error(`Falha na consulta: ${err.message}`, { id: toastId });
    } finally {
      setIsConsultandoGuia(null);
    }
  };

  if (loading) {
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
              <h1 className="header-title">Licenças & <span className="text-primary/90 font-black">Taxas</span></h1>
              <FavoriteToggleButton moduleId="licencas" />
            </div>
            <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm">Controle de alvarás, vigilância sanitária, corpo de bombeiros e taxas municipais.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                <span className="text-sm font-black">{stats.total}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[8px] text-primary font-black tracking-wider">OK</span>
                <span className="text-sm font-black text-primary">{stats.ok}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center">
                <span className="text-[10px] text-rose-600 font-bold tracking-wider">Alertas</span>
                <span className="text-sm font-black text-rose-600">{stats.alerts}</span>
              </div>
            </div>
            <div className="relative flex-1 md:w-[280px] group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
              <input type="text" placeholder="PROCURAR EMPRESA..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 h-10 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl outline-none text-[12px] font-black uppercase focus:ring-1 focus:ring-primary/20 transition-all placeholder:opacity-40 shadow-inner" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "licencas" && (
              <div className="flex bg-black/10 dark:bg-white/5 p-0.5 rounded-xl border border-border/10 shrink-0 h-10 items-center shadow-inner">
                {[
                  { id: "todos", label: "Geral" },
                  { id: "definitiva", label: "Definitivas" },
                  { id: "com_vencimento", label: "Vencimentos" },
                  { id: "em_processo", label: "Processo" }
                ].map(s => (
                  <button key={s.id} onClick={() => setFilterStatus(s.id as any)} className={`px-4 h-full rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterStatus === s.id ? "bg-card text-primary shadow-sm" : "text-foreground hover:text-foreground"}`}>{s.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navegação por Abas Integradas - Alta Legibilidade */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-[1.5rem] border border-border/20 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Abas Principais */}
          <div className="flex p-1 gap-1 border-b border-border/10">
            {[
              { id: "licencas", label: "Status das Licenças", icon: <Shield size={14} /> },
              { id: "taxas", label: "Taxas Mensais", icon: <FileText size={14} /> }
            ].map(t => (
              <button
                key={t.id}
                className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-lg scale-[1.01]" : "text-muted-foreground hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5"}`}
                onClick={() => { setActiveTab(t.id as any); setExpanded(null); }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Sub-abas Conectadas */}
          <div className="px-6 py-4 bg-slate-50/50 dark:bg-black/20 flex items-center gap-8 animate-in slide-in-from-top-2 duration-300 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-zinc-800 rounded-xl border border-border/10 shadow-sm">
              {[
                { id: "ativas", label: "Ativas" },
                { id: "mei", label: "MEI" },
                { id: "paralisadas", label: "Paralisadas" },
                { id: "baixadas", label: "Baixadas" },
                { id: "entregue", label: "Entregues" }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveStatusTab(s.id as any)}
                  className={`flex items-center gap-2 px-6 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeStatusTab === s.id ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-primary dark:hover:text-white"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-black/[0.03] dark:bg-white/[0.02] border border-border/10 rounded-[2.5rem] shadow-inner p-1 pb-4 relative">
          <div className="hidden md:grid grid-cols-[2.5fr_1.5fr_1.5fr_1fr_60px] px-6 py-4 text-[10px] font-black uppercase text-muted-foreground/60 mb-0 relative z-20">
            <span>Empresa</span>
            <span>CNPJ</span>
            <span>{activeTab === 'licencas' ? 'Status Geral' : 'Status Taxas'}</span>
            <span className="text-center">{activeTab === 'licencas' ? 'Próximo Venc.' : 'Data Envio'}</span>
            <span className="text-right pr-2">Ações</span>
          </div>

          <div className="space-y-3 px-1 relative z-10">
            {filtered.map(emp => {
              const isOpen = expanded === emp.id;
              const empLicencas = licByEmpresa(emp.id);

              const renderStatusIndicators = () => {
                if (activeTab === 'licencas') {
                  const statusCounts = empLicencas.reduce((acc, l) => {
                    acc[l.status] = (acc[l.status] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  if (empLicencas.length === 0) return <span className="text-[9px] text-muted-foreground/40 font-black uppercase">Nenhuma Licença</span>;

                  const mainStatus = statusCounts.com_vencimento ? 'warning' : (statusCounts.em_processo ? 'info' : 'success');
                  const label = statusCounts.com_vencimento ? 'Vencimentos' : (statusCounts.em_processo ? 'Processo' : 'Regular');

                  return (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-sm",
                      mainStatus === 'success' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        mainStatus === 'warning' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}>
                      {label}
                    </span>
                  );
                } else {
                  const tForm = taxasForm[emp.id] || {};
                  const licTypes = empLicencas.map(l => l.tipo_licenca);
                  const allSent = licTypes.length > 0 && licTypes.every(type => tForm[type]?.status === 'enviada');

                  return (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-sm",
                      allSent ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {allSent ? "CONCLUÍDO" : "PENDENTE"}
                    </span>
                  );
                }
              };

              const getNextVenc = () => {
                if (activeTab === 'licencas') {
                  const dates = empLicencas.filter(l => l.vencimento).map(l => new Date(l.vencimento!).getTime());
                  if (dates.length === 0) return "—";
                  return formatDateBR(new Date(Math.min(...dates)).toISOString());
                } else {
                  const tForm = taxasForm[emp.id] || {};
                  const dates = Object.values(tForm).filter(t => t.data_envio).map(t => new Date(t.data_envio!).getTime());
                  if (dates.length === 0) return "—";
                  return formatDateBR(new Date(Math.max(...dates)).toISOString());
                }
              };

              const customHeader = (
                <div className="md:grid md:grid-cols-[2.5fr_1.5fr_1.5fr_1fr_60px] items-center w-full py-1 gap-6">
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
                        {emp.cnpj || "CNPJ NÃO INFORMADO"}
                      </span>
                    </div>
                  </div>

                  <div className="hidden md:block text-[11px] font-black text-muted-foreground/60 font-mono tracking-tighter">
                    {emp.cnpj || "—"}
                  </div>

                  <div className="hidden md:flex justify-start">
                    {renderStatusIndicators()}
                  </div>

                  <div className="hidden md:block text-center text-[11px] font-black text-muted-foreground/40">
                    {getNextVenc()}
                  </div>

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
                  onClick={() => setExpanded(isOpen ? null : emp.id)}
                  customHeader={customHeader}
                  nome_empresa={emp.nome_empresa}
                  icon={<Building2 size={20} />}
                >
                  <div className="max-w-6xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Tabs defaultValue={activeTab === 'licencas' ? 'licencas' : 'taxas'} className="space-y-4">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-border/10 pb-3">
                        <TabsList className="bg-black/10 dark:bg-white/10 p-0.5 rounded-xl h-9 border border-border/10 shadow-inner">
                          <TabsTrigger value={activeTab === 'licencas' ? 'licencas' : 'taxas'} className="px-6 h-7 text-[11px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                            {activeTab === 'licencas' ? 'Painel Licenças' : 'Painel Taxas'}
                          </TabsTrigger>
                          <TabsTrigger value="pastas" className="px-6 h-7 text-[11px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Pastas</TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="licencas" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(licencaLabels).map(([key, label]) => {
                            const lic = empLicencas.find((l: LicencaRecord) => l.tipo_licenca === key);
                            const licFormData = (licencasForm[emp.id] && licencasForm[emp.id][key]) || { status: null, vencimento: null, numero_processo: null };
                            const currentStatus = licFormData.status || "";

                            const cfg = tipoStatusLabels[currentStatus] || { label: "Não definido", cls: "badge-gray" };
                            const dias = currentStatus === "com_vencimento" ? calcDias(licFormData.vencimento) : null;
                            const isExpired = dias !== null && dias < 0;
                            const isNear = dias !== null && dias >= 0 && dias <= 30;

                            return (
                              <div key={key} className="bg-card p-4 rounded-2xl border border-border/10 shadow-sm group/item hover:border-primary/20 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="space-y-1">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-primary/80">{label}</h4>
                                    <select
                                      value={currentStatus}
                                      onChange={(e) => handleLicencaDataChange(emp.id, key, 'status', e.target.value)}
                                      className={cn(
                                        "h-7 px-2.5 rounded-full text-[9px] font-black uppercase tracking-widest outline-none border-none cursor-pointer transition-all",
                                        currentStatus === "definitiva" ? "bg-emerald-500/10 text-emerald-500" :
                                          currentStatus === "com_vencimento" ? "bg-amber-500/10 text-amber-500" :
                                            currentStatus === "em_processo" ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      <option value="">Não definido</option>
                                      <option value="definitiva">Definitiva</option>
                                      <option value="dispensada">Dispensada</option>
                                      <option value="com_vencimento">Com Vencimento</option>
                                      <option value="em_processo">Em Processo</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {lic?.file_url ? (
                                      <button onClick={() => window.open(lic.file_url, "_blank")} className="w-9 h-9 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center border border-primary/10"><Eye size={14} /></button>
                                    ) : (
                                      <div className="relative">
                                        <input type="file" accept=".pdf" className="hidden" id={`upload-${emp.id}-${key}`} onChange={async (e) => {
                                          const file = e.target.files?.[0]; if (!file) return;
                                          toast.loading("Enviando...", { id: "up-lic" });
                                          const path = `licencas/${emp.id}/${key}_${Date.now()}.pdf`;
                                          const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
                                          if (upErr) { toast.error("Erro: " + upErr.message, { id: "up-lic" }); return; }
                                          const { data: { publicUrl } } = supabase.storage.from("documentos").getPublicUrl(path);

                                          // Update or Insert
                                          const { data: existing } = await supabase.from("licencas").select("id").eq("empresa_id", emp.id).eq("tipo_licenca", key).single();
                                          let dbErr;
                                          if (existing) {
                                            dbErr = (await supabase.from("licencas").update({ file_url: publicUrl }).eq("id", existing.id)).error;
                                          } else {
                                            dbErr = (await supabase.from("licencas").insert({ empresa_id: emp.id, tipo_licenca: key, file_url: publicUrl, status: 'com_vencimento' })).error;
                                          }

                                          if (dbErr) { toast.error("Erro DB: " + dbErr.message, { id: "up-lic" }); } else { toast.success("Anexo salvo!", { id: "up-lic" }); loadBaseData(); }
                                        }} />
                                        <label htmlFor={`upload-${emp.id}-${key}`} className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all cursor-pointer flex items-center justify-center border border-border/10"><Upload size={14} /></label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {currentStatus === "com_vencimento" && (
                                    <div className="space-y-1">
                                      <label className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest ml-1">Data de Vencimento</label>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="date"
                                          value={licFormData.vencimento || ""}
                                          onChange={(e) => handleLicencaDataChange(emp.id, key, 'vencimento', e.target.value)}
                                          className="flex-1 h-9 px-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                        />
                                        {dias !== null && <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter whitespace-nowrap", isExpired ? 'bg-rose-500 text-white animate-pulse' : isNear ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500')}>{isExpired ? "Vencida" : `${dias} d`}</span>}
                                      </div>
                                    </div>
                                  )}
                                  {currentStatus === "em_processo" && (
                                    <div className="space-y-1">
                                      <label className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest ml-1">Nº do Processo</label>
                                      <input
                                        type="text"
                                        placeholder="Número do processo..."
                                        value={licFormData.numero_processo || ""}
                                        onChange={(e) => handleLicencaDataChange(emp.id, key, 'numero_processo', e.target.value)}
                                        className="w-full h-9 px-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-end pt-4 border-t border-border/5">
                          <button onClick={() => saveLicencasData(emp.id)} className="h-10 px-8 bg-primary text-primary-foreground rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95"><Save size={14} /> Salvar Licenças</button>
                        </div>
                      </TabsContent>

                      <TabsContent value="taxas" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(licencaLabels).map(([key, label]) => {
                            const lic = empLicencas.find((l: LicencaRecord) => l.tipo_licenca === key);
                            if (!lic) return null;
                            const taxaData = (taxasForm[emp.id] && taxasForm[emp.id][key]) || { status: 'pendente', data_envio: '', forma_envio: '' };

                            return (
                              <div key={key} className="bg-card p-5 rounded-2xl border border-border/10 shadow-sm space-y-4">
                                <div className="flex items-center justify-between gap-4 border-b border-border/5 pb-3">
                                  <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Shield size={14} /> {label}</h4>
                                  {key === 'alvara' && (
                                    <button onClick={() => handleConsultarGuiaAlvara(emp.cnpj)} disabled={isConsultandoGuia === emp.cnpj} className="h-8 px-4 bg-primary/5 text-primary border border-primary/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all flex items-center gap-2 disabled:opacity-50">
                                      {isConsultandoGuia === emp.cnpj ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Search size={12} />}
                                      {isConsultandoGuia === emp.cnpj ? 'Consultando...' : 'Buscar Guia'}
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Status</label>
                                    <select className="w-full h-9 px-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-lg text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all" value={taxaData.status} onChange={(e) => handleTaxaChange(emp.id, key, 'status', e.target.value as any)}>
                                      <option value="pendente">Pendente</option>
                                      <option value="gerada">Gerada</option>
                                      <option value="enviada">Enviada</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Vencimento</label>
                                    <input type="date" className="w-full h-9 px-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-lg text-[11px] font-bold outline-none focus:ring-1 focus:ring-primary/20 transition-all" value={taxaData.data_vencimento || ''} onChange={(e) => handleTaxaChange(emp.id, key, 'data_vencimento', e.target.value)} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Envio</label>
                                    <input type="date" className="w-full h-9 px-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-lg text-[11px] font-bold outline-none focus:ring-1 focus:ring-primary/20 transition-all" value={taxaData.data_envio || ''} onChange={(e) => handleTaxaChange(emp.id, key, 'data_envio', e.target.value)} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Forma</label>
                                    <input type="text" placeholder="WhatsApp" className="w-full h-9 px-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-lg text-[11px] font-bold outline-none focus:ring-1 focus:ring-primary/20 transition-all" value={taxaData.forma_envio || ''} onChange={(e) => handleTaxaChange(emp.id, key, 'forma_envio', e.target.value)} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-end pt-4 border-t border-border/5">
                          <button onClick={() => saveTaxas(emp.id)} className="h-10 px-8 bg-primary text-primary-foreground rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95"><Save size={14} /> Gravar Taxas</button>
                        </div>
                      </TabsContent>

                      <TabsContent value="pastas" className="animate-in slide-in-from-right-1 duration-200 outline-none">
                        <div className="bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-border/10 p-0.5 overflow-hidden shadow-inner">
                          <ModuleFolderView empresa={emp} departamentoId="geral" />
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
                <p className="text-[12px] font-black text-foreground uppercase tracking-widest">Nenhuma empresa encontrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicencasPage;
