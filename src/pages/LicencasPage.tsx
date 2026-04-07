import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import {
  Search, Building2, ChevronDown, ChevronUp,
  Shield, CheckCircle, Clock, AlertTriangle, Save,
  Upload, Eye, FileText
} from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { LicencaRecord, LicencaTaxaRecord, GuiaStatus } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

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
  const [isConsultandoGuia, setIsConsultandoGuia] = useState<string | null>(null);

  const loadBaseData = async () => {
    const { data: lics } = await supabase.from("licencas").select("*");
    setLicencas((lics as unknown as LicencaRecord[]) || []);
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

  const licByEmpresa = (empId: string) => licencas.filter(l => l.empresa_id === empId);

  // Filters for Licencas Tab
  const filteredLicencas = empresas.filter(e => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const matchStatus = filterStatus === "todos" || licByEmpresa(e.id).some((l: LicencaRecord) => l.status === filterStatus);

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

    return matchSearch && matchStatus && matchTab;
  });

  // Filters for Taxas Tab (Shows only companies that have at least one valid license)
  const filteredTaxas = empresas.filter(e => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const hasAnyLicence = licByEmpresa(e.id).length > 0;

    let matchTab = false;
    if (activeStatusTab === "ativas") {
      matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa !== "mei";
    } else if (activeStatusTab === "mei") {
      matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa === "mei";
    } else if (activeStatusTab === "paralisadas") {
      matchTab = e.situacao === "paralisada";
    } else if (activeStatusTab === "baixadas") {
      matchTab = e.situacao === "baixada";
    }

    return matchSearch && hasAnyLicence && matchTab;
  });

  const counts = {
    definitiva: licencas.filter(l => l.status === "definitiva").length,
    dispensada: licencas.filter(l => l.status === "dispensada").length,
    com_vencimento: licencas.filter(l => l.status === "com_vencimento").length,
    em_processo: licencas.filter(l => l.status === "em_processo").length
  };

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

  const inputCls = "w-full px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none";
  const labelCls = "block text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <h1 className="header-title">Licenças <span className="text-primary/90">& Taxas</span></h1>
             <FavoriteToggleButton moduleId="licencas" />
          </div>
          <p className="subtitle-premium">Monitoramento de alvarás, vigilância sanitária, corpo de bombeiros e controle de taxas municipais.</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-col gap-6">
        <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar w-full sm:w-max shadow-sm">
            <button
                onClick={() => { setActiveTab("licencas"); setExpanded(null); }}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "licencas" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
            >
                <Shield size={14} /> Status das Licenças
            </button>
            <button
                onClick={() => { setActiveTab("taxas"); setExpanded(null); }}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "taxas" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
            >
                <FileText size={14} /> Taxas Mensais
            </button>
        </div>

        {/* Sub-Tabs for Portfolios */}
        <div className="flex bg-muted/20 p-1.5 rounded-2xl border border-border/40 overflow-x-auto no-scrollbar w-full shadow-inner">
            {[
            { key: "ativas", label: "Empresas Ativas" },
            { key: "mei", label: "Empresas MEI" },
            { key: "paralisadas", label: "Paralisadas" },
            { key: "baixadas", label: "Baixadas" },
            { key: "entregue", label: "Entregues" }
            ].map(tab => (
            <button
                key={tab.key}
                onClick={() => setActiveStatusTab(tab.key as any)}
                className={`flex-1 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeStatusTab === tab.key ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
            >
                {tab.label}
            </button>
            ))}
        </div>
      </div>

      {activeTab === "licencas" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* KPI Cards for Licenses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Definitivas", count: counts.definitiva, cls: "text-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle size={20} /> },
              { label: "Vencimentos", count: counts.com_vencimento, cls: "text-amber-500", bg: "bg-amber-500/10", icon: <Clock size={20} /> },
              { label: "Em Processo", count: counts.em_processo, cls: "text-primary", bg: "bg-primary/10", icon: <Shield size={20} /> },
              { label: "Dispensadas", count: counts.dispensada, cls: "text-slate-400", bg: "bg-slate-400/10", icon: <AlertTriangle size={20} /> }
            ].map(s => (
              <div key={s.label} className="card-premium !p-6 flex items-center justify-between group hover:scale-[1.02] transition-all duration-300 border-none shadow-lg shadow-black/5">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{s.label}</p>
                  <p className={`text-3xl font-black ${s.cls} tracking-tight`}>{s.count}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.bg} ${s.cls} border border-current/10 shadow-inner group-hover:scale-110 transition-transform`}>
                  {s.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-muted/30 p-6 rounded-3xl border border-border/60">
              <div className="relative w-full lg:max-w-md">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar por empresa ou CNPJ..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-card border border-border/40 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm placeholder:font-normal placeholder:tracking-normal"
                />
              </div>
              
              <div className="flex bg-card p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar w-full lg:w-auto shadow-sm">
                {[
                  { key: "todos", label: "Todos" },
                  { key: "definitiva", label: "Definitivas" },
                  { key: "com_vencimento", label: "Vencimentos" },
                  { key: "em_processo", label: "Processo" },
                  { key: "dispensada", label: "Dispensadas" }
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterStatus(f.key)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === f.key ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
          </div>

          <div className="space-y-4">
            {filteredLicencas.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-border/40 rounded-3xl opacity-40">
                    <Shield size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma empresa encontrada</p>
                </div>
            ) : filteredLicencas.map(emp => {
              const isOpen = expanded === emp.id;
              const empLicencas = licByEmpresa(emp.id);
              
              return (
                <div key={emp.id} className={`group bg-card border ${isOpen ? 'border-primary/30 shadow-lg' : 'border-border/60 hover:border-primary/20'} rounded-3xl transition-all duration-300 overflow-hidden`}>
                  <div 
                    className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/30'}`} 
                    onClick={() => setExpanded(isOpen ? null : emp.id)}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-primary/10 text-primary'}`}>
                        <Building2 size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-sm uppercase tracking-tight text-card-foreground line-clamp-1">{emp.nome_empresa}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{emp.cnpj || "CNPJ NÃO INFORMADO"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex gap-2">
                             {empLicencas.map((l: LicencaRecord, i: number) => { 
                                 const cfg = tipoStatusLabels[l.status || ""] || { label: "—", cls: "badge-gray" }; 
                                 return <span key={i} className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.cls.replace('badge-', 'bg-').replace('gray', 'muted').replace('info', 'primary')}/10 ${cfg.cls.replace('badge-', 'text-').replace('gray', 'muted-foreground').replace('info', 'primary')}`}>{cfg.label}</span>; 
                             })}
                        </div>
                      <div className={`p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-primary transition-all ${isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border/40 p-8 bg-muted/5 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(licencaLabels).map(([key, label]) => {
                          const lic = empLicencas.find((l: LicencaRecord) => l.tipo_licenca === key);
                          const cfg = lic ? tipoStatusLabels[lic.status] || { label: "Não definido", cls: "badge-gray" } : { label: "Não definido", cls: "badge-gray" };
                          const dias = lic?.status === "com_vencimento" ? calcDias(lic.vencimento) : null;
                          const isExpired = dias !== null && dias < 0;
                          const isNear = dias !== null && dias >= 0 && dias <= 30;

                          return (
                            <div key={key} className="p-6 rounded-3xl border border-border/60 bg-card group/item hover:border-primary/30 transition-all shadow-sm">
                              <div className="flex items-center justify-between mb-6">
                                <div className="space-y-1">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-primary/80">{label}</h4>
                                    <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.cls.replace('badge-', 'bg-').replace('gray', 'muted').replace('info', 'primary')}/10 ${cfg.cls.replace('badge-', 'text-').replace('gray', 'muted-foreground').replace('info', 'primary')}`}>
                                        {cfg.label}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {lic?.file_url ? (
                                    <button
                                      onClick={() => window.open(lic.file_url, "_blank")}
                                      className="w-10 h-10 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center border border-primary/20"
                                      title="Visualizar anexo"
                                    >
                                      <Eye size={16} />
                                    </button>
                                  ) : (
                                    <div className="relative">
                                      <input
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        id={`upload-${emp.id}-${key}`}
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          toast.loading("Enviando...", { id: "up-lic" });
                                          const path = `licencas/${emp.id}/${key}_${Date.now()}.pdf`;
                                          const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
                                          if (upErr) { toast.error("Erro: " + upErr.message, { id: "up-lic" }); return; }
                                          const { data: { publicUrl } } = supabase.storage.from("documentos").getPublicUrl(path);
                                          const { error: dbErr } = await supabase.from("licencas").update({ file_url: publicUrl }).eq("empresa_id", emp.id).eq("tipo_licenca", key);
                                          if (dbErr) { toast.error("Erro DB: " + dbErr.message, { id: "up-lic" }); } else { toast.success("Anexo salvo!", { id: "up-lic" }); loadBaseData(); }
                                        }}
                                      />
                                      <label
                                        htmlFor={`upload-${emp.id}-${key}`}
                                        className="w-10 h-10 rounded-xl bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all cursor-pointer flex items-center justify-center border border-border/60"
                                        title="Anexar PDF"
                                      >
                                        <Upload size={16} />
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                  {lic?.status === "com_vencimento" && lic.vencimento && (
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/40">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">VENCIMENTO</span>
                                            <span className="text-[10px] font-bold">{formatDateBR(lic.vencimento)}</span>
                                        </div>
                                        {dias !== null && (
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${isExpired ? 'bg-destructive text-destructive-foreground animate-pulse' : isNear ? 'bg-warning/20 text-warning' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                                {isExpired ? "Vencida" : `${dias} dias`}
                                            </span>
                                        )}
                                    </div>
                                  )}
                                  {lic?.status === "em_processo" && lic.numero_processo && (
                                    <div className="p-3 bg-muted/30 rounded-2xl border border-border/40">
                                        <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter block">Nº PROCESSO</span>
                                        <span className="text-[10px] font-bold text-primary">{lic.numero_processo}</span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "taxas" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Taxes Header Controls */}
           <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-muted/30 p-8 rounded-3xl border border-border/60">
              <div className="relative w-full lg:max-w-md">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por empresa ou CNPJ..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="w-full h-14 pl-12 pr-4 bg-card border border-border/40 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm placeholder:font-normal placeholder:tracking-normal" 
                />
              </div>
              <div className="flex items-center gap-4 bg-card p-2 rounded-2xl border border-border/60 shadow-sm">
                <div className="flex flex-col pl-3">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Competência</span>
                    <input 
                        type="month" 
                        value={competencia} 
                        onChange={e => setCompetencia(e.target.value)} 
                        className="bg-transparent border-none p-0 text-sm font-black text-primary outline-none focus:ring-0 cursor-pointer font-ubuntu h-5" 
                    />
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Clock size={18} />
                </div>
              </div>
           </div>

          <div className="space-y-4">
            {filteredTaxas.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-border/40 rounded-3xl opacity-40">
                    <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma empresa com licenças encontradas</p>
                </div>
            ) : filteredTaxas.map(emp => {
              const isOpen = expanded === emp.id;
              const empLicencas = licByEmpresa(emp.id);
              
              return (
                <div key={emp.id} className={`group bg-card border ${isOpen ? 'border-primary/30 shadow-lg' : 'border-border/60 hover:border-primary/20'} rounded-3xl transition-all duration-300 overflow-hidden`}>
                  <div 
                    className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/30'}`} 
                    onClick={() => setExpanded(isOpen ? null : emp.id)}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-primary/10 text-primary'}`}>
                        <Building2 size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-sm uppercase tracking-tight text-card-foreground line-clamp-1">{emp.nome_empresa}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{emp.cnpj || "CNPJ NÃO INFORMADO"} • {empLicencas.length} LICENÇA(S)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-primary transition-all ${isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border/40 p-8 space-y-8 bg-muted/5 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {Object.entries(licencaLabels).map(([key, label]) => {
                          const lic = empLicencas.find((l: LicencaRecord) => l.tipo_licenca === key);
                          if (!lic) return null;
                          const taxaData = (taxasForm[emp.id] && taxasForm[emp.id][key]) || { status: 'pendente', data_envio: '', forma_envio: '' };

                          return (
                            <div key={key} className="p-8 rounded-3xl border border-border/60 bg-card group/item hover:border-primary/30 transition-all shadow-sm space-y-6">
                              <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-5">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                  <Shield size={16} /> {label}
                                </h4>
                                {key === 'alvara' && (
                                  <button
                                    onClick={() => handleConsultarGuiaAlvara(emp.cnpj)}
                                    disabled={isConsultandoGuia === emp.cnpj}
                                    className="h-10 px-5 bg-info text-info-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-info/10 disabled:opacity-50"
                                  >
                                    {isConsultandoGuia === emp.cnpj ? (
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : <Search size={14} />}
                                    {isConsultandoGuia === emp.cnpj ? 'CONSULTANDO...' : 'BUSCAR GUIA'}
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status da Guia</label>
                                  <select
                                    className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
                                    value={taxaData.status}
                                    onChange={(e) => handleTaxaChange(emp.id, key, 'status', e.target.value as any)}
                                  >
                                    <option value="pendente">Pendente</option>
                                    <option value="gerada">Gerada</option>
                                    <option value="enviada">Enviada</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vencimento</label>
                                  <input
                                    type="date"
                                    className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu"
                                    value={taxaData.data_vencimento || ''}
                                    onChange={(e) => handleTaxaChange(emp.id, key, 'data_vencimento', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data de Envio</label>
                                  <input
                                    type="date"
                                    className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu"
                                    value={taxaData.data_envio || ''}
                                    onChange={(e) => handleTaxaChange(emp.id, key, 'data_envio', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Forma de Envio</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: WhatsApp"
                                    className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={taxaData.forma_envio || ''}
                                    onChange={(e) => handleTaxaChange(emp.id, key, 'forma_envio', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end pt-6 border-t border-border/40">
                        <button
                          onClick={() => saveTaxas(emp.id)}
                          className="h-14 px-12 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
                        >
                          <Save size={18} /> SALVAR TAXAS DO MÊS
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LicencasPage;
