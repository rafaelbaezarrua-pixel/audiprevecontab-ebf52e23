import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { Search, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp, Save, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { ProcuracaoRecord } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderOpen } from "lucide-react";

const calcDias = (data?: string | null) => { if (!data) return 999; return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); };

const ProcuracoesPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("procuracoes");
  const [procData, setProcData] = useState<Record<string, ProcuracaoRecord>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, Partial<ProcuracaoRecord>>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");

  useEffect(() => {
    const load = async () => {
      const { data: procs } = await supabase.from("procuracoes").select("*");
      const map: Record<string, ProcuracaoRecord> = {};
      (procs as unknown as ProcuracaoRecord[])?.forEach(p => { map[p.empresa_id] = p; });
      setProcData(map);
    };
    load();
  }, []);

  const empresasWithProc = empresas.map(emp => {
    const proc = procData[emp.id] || {} as ProcuracaoRecord;
    const dias = calcDias(proc.data_vencimento);
    const status = dias === 999 ? "sem_dados" : dias < 0 ? "vencida" : dias <= 30 ? "proxima" : "ativa";
    return { ...emp, proc, dias, status };
  });

  const filtered = empresasWithProc.filter(e => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const matchStatus = filterStatus === "todos" || e.status === filterStatus;

    let matchTab = false;
    if (activeTab === "ativas") {
      matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa !== "mei";
    } else if (activeTab === "mei") {
      matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa === "mei";
    } else if (activeTab === "paralisadas") {
      matchTab = e.situacao === "paralisada";
    } else if (activeTab === "baixadas") {
      matchTab = e.situacao === "baixada";
    } else if (activeTab === "entregue") {
      matchTab = e.situacao === "entregue";
    }

    return matchSearch && matchStatus && matchTab;
  });

  const counts = {
    ativas: filtered.filter(e => e.status === "ativa").length,
    proximas: filtered.filter(e => e.status === "proxima").length,
    vencidas: filtered.filter(e => e.status === "vencida").length,
    semDados: filtered.filter(e => e.status === "sem_dados").length
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const emp = empresasWithProc.find(e => e.id === id);
    if (emp) {
      const p = emp.proc as ProcuracaoRecord;
      setEditForm(prev => ({ ...prev, [id]: { data_cadastro: p.data_cadastro || "", data_vencimento: p.data_vencimento || "", observacao: p.observacao || "" } }));
    }
  };

  const handleSave = async (empresaId: string) => {
    const form = editForm[empresaId];
    const existing = procData[empresaId];
    try {
      if (existing?.id) {
        await supabase.from("procuracoes").update({ data_cadastro: form.data_cadastro || null, data_vencimento: form.data_vencimento || null, observacao: form.observacao || null }).eq("id", existing.id);
      } else {
        await supabase.from("procuracoes").insert({ empresa_id: empresaId, data_cadastro: form.data_cadastro || null, data_vencimento: form.data_vencimento || null, observacao: form.observacao || null });
      }
      toast.success("Procuração atualizada!");
      // Reload
      const { data: procs } = await supabase.from("procuracoes").select("*");
      const map: Record<string, ProcuracaoRecord> = {};
      (procs as unknown as ProcuracaoRecord[])?.forEach(p => { map[p.empresa_id] = p; });
      setProcData(map);
    } catch (err: any) { toast.error(err.message); }
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <h1 className="header-title">Procurações <span className="text-primary/90">Eletrônicas</span></h1>
             <FavoriteToggleButton moduleId="procuracoes" />
          </div>
          <p className="subtitle-premium">Controle rigoroso de validade e renovação para e-CAC, Receita Federal, SEFAZ e Prefeituras.</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar w-full shadow-sm">
        {[
          { key: "ativas", label: "Empresas Ativas" },
          { key: "mei", label: "Empresas MEI" },
          { key: "paralisadas", label: "Paralisadas" },
          { key: "baixadas", label: "Baixadas" },
          { key: "entregue", label: "Entregues" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: "ativa", label: "Ativas", count: counts.ativas, cls: "text-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle size={20} /> },
          { key: "proxima", label: "Próximas", count: counts.proximas, cls: "text-amber-500", bg: "bg-amber-500/10", icon: <Clock size={20} /> },
          { key: "vencida", label: "Vencidas", count: counts.vencidas, cls: "text-destructive", bg: "bg-destructive/10", icon: <AlertTriangle size={20} /> },
          { key: "sem_dados", label: "Sem Dados", count: counts.semDados, cls: "text-slate-400", bg: "bg-slate-400/10", icon: <AlertTriangle size={20} /> }
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilterStatus(s.key)}
            className={`card-premium !p-6 flex items-center justify-between transition-all duration-300 group border-none shadow-lg shadow-black/5 ${filterStatus === s.key ? "ring-2 ring-primary shadow-primary/20 scale-[1.02]" : "hover:scale-[1.01]"}`}
          >
            <div className="text-left space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{s.label}</p>
              <p className={`text-3xl font-black ${s.cls} tracking-tight`}>{s.count}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.bg} ${s.cls} border border-current/10 shadow-inner group-hover:scale-110 transition-transform`}>
              {s.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Search & Global Filter */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-muted/30 p-6 rounded-3xl border border-border/60">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar por empresa ou CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-card border border-border/40 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm placeholder:font-normal placeholder:tracking-normal"
            />
          </div>
          
          <button
            onClick={() => setFilterStatus("todos")}
            className={`h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border border-border/60 flex items-center gap-2 ${filterStatus === "todos" ? "bg-primary text-primary-foreground shadow-primary/20" : "bg-card text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
          >
            <div className={`w-2 h-2 rounded-full ${filterStatus === "todos" ? "bg-white" : "bg-muted-foreground"}`} />
            Todos os Status
          </button>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const form = editForm[emp.id] || {};
          const isVencida = emp.status === "vencida";
          const isProxima = emp.status === "proxima";
          const isAtiva = emp.status === "ativa";
          
          return (
            <div key={emp.id} className={`group bg-card border ${isOpen ? 'border-primary/30 shadow-lg' : 'border-border/60 hover:border-primary/20'} rounded-3xl transition-all duration-300 overflow-hidden`}>
              <div 
                className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/30'}`} 
                onClick={() => toggleExpand(emp.id)}
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
                  {(emp.proc as ProcuracaoRecord).data_vencimento && (
                    <div className="hidden sm:flex flex-col items-end">
                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">VENCIMENTO</span>
                       <span className="text-[10px] font-bold text-card-foreground">{formatDateBR((emp.proc as ProcuracaoRecord).data_vencimento!)}</span>
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isVencida ? 'bg-destructive/10 text-destructive' : isProxima ? 'bg-warning/10 text-warning' : isAtiva ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                    {isVencida ? "Vencida" : isProxima ? "Próxima" : isAtiva ? "Ativa" : "Pendente"}
                  </span>
                  <div className={`p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-primary transition-all ${isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border/40 p-8 bg-muted/5 animate-in slide-in-from-top-4 duration-300">
                  <Tabs defaultValue="dados" className="w-full">
                    <TabsList className="bg-muted/50 p-1 rounded-xl h-12 mb-8">
                      <TabsTrigger value="dados" className="px-8 h-10 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary shadow-sm transition-all whitespace-nowrap">Dados da Procuração</TabsTrigger>
                      <TabsTrigger value="pastas" className="px-8 h-10 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary shadow-sm transition-all whitespace-nowrap flex items-center gap-2">
                        <FolderOpen size={14} /> Arquivos / Pastas
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados" className="space-y-8 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data de Cadastro</label>
                        <input 
                            type="date" 
                            value={form.data_cadastro || ""} 
                            onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], data_cadastro: e.target.value } }))} 
                            className="w-full h-14 px-5 bg-muted/30 border border-border/60 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu" 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data de Vencimento</label>
                        <input 
                            type="date" 
                            value={form.data_vencimento || ""} 
                            onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], data_vencimento: e.target.value } }))} 
                            className="w-full h-14 px-5 bg-muted/30 border border-border/60 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu" 
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observações</label>
                        <input 
                            value={form.observacao || ""} 
                            placeholder="Notas sobre portais (e-CAC, SEFAZ...)"
                            onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], observacao: e.target.value } }))} 
                            className="w-full h-14 px-5 bg-muted/30 border border-border/60 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                        />
                    </div>
                  </div>
                </TabsContent>

                    <TabsContent value="pastas" className="animate-in slide-in-from-right-4 duration-300">
                       <ModuleFolderView empresa={emp} departamentoId="geral" />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcuracoesPage;
