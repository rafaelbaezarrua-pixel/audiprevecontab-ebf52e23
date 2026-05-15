import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { Search, ChevronDown, Save, Building2, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { ProcuracaoRecord } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmpresaAccordion } from "@/components/EmpresaAccordion";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";

const calcDias = (data?: string | null) => { if (!data) return 999; return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); };

const ProcuracoesPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("procuracoes");
  const [procData, setProcData] = useState<Record<string, ProcuracaoRecord>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "ativa" | "proxima" | "vencida">("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, Partial<ProcuracaoRecord>>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");
  const [rowTabs, setRowTabs] = useState<Record<string, "dados" | "pastas">>({});

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
      const { data: procs } = await supabase.from("procuracoes").select("*");
      const map: Record<string, ProcuracaoRecord> = {};
      (procs as unknown as ProcuracaoRecord[])?.forEach(p => { map[p.empresa_id] = p; });
      setProcData(map);
      setExpanded(null);
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) {
    return (<div className="space-y-6"><PageHeaderSkeleton /><TableSkeleton rows={8} /></div>);
  }

  return (
    <div className="animate-fade-in relative pb-10">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div className="space-y-1 -mt-2">
            <div className="flex items-center gap-2">
              <h1 className="header-title">Procurações <span className="text-primary/90 font-black">Eletrônicas</span></h1>
              <FavoriteToggleButton moduleId="procuracoes" />
            </div>
            <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm">Controle rigoroso de validade e renovação para e-CAC, Receita Federal, SEFAZ e Prefeituras.</p>
          </div>
        </div>

        {/* Stats & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl overflow-hidden h-10 shrink-0 p-0.5 shadow-inner">
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[8px] text-foreground font-black tracking-wider">Total</span>
                <span className="text-sm font-black">{filtered.length}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[8px] text-primary font-black tracking-wider">Ativas</span>
                <span className="text-sm font-black text-primary">{counts.ativas}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[10px] text-amber-500 font-bold tracking-wider">Próximas</span>
                <span className="text-sm font-black text-amber-500">{counts.proximas}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center">
                <span className="text-[10px] text-rose-600 font-bold tracking-wider">Vencidas</span>
                <span className="text-sm font-black text-rose-600">{counts.vencidas}</span>
              </div>
            </div>
            <div className="relative flex-1 md:w-[280px] group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
              <input type="text" placeholder="PROCURAR EMPRESA..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 h-10 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl outline-none text-[12px] font-black uppercase focus:ring-1 focus:ring-primary/20 transition-all placeholder:opacity-40 shadow-inner" />
            </div>
          </div>
          <div className="flex bg-black/10 dark:bg-white/5 p-0.5 rounded-xl border border-border/10 shrink-0 h-10 items-center shadow-inner">
            {[{ id: "todos", label: "Geral" }, { id: "ativa", label: "Ativas" }, { id: "proxima", label: "Próximas" }, { id: "vencida", label: "Vencidas" }].map(s => (
              <button key={s.id} onClick={() => setFilterStatus(s.id as any)} className={`px-4 h-full rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterStatus === s.id ? "bg-card text-primary shadow-sm" : "text-foreground hover:text-foreground"}`}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Category Tabs Container */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-[1.5rem] border border-border/20 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex p-1 gap-1 border-b border-border/10">
            {[
              { id: "ativas", label: "Empresas Ativas" },
              { id: "mei", label: "MEI" },
              { id: "paralisadas", label: "Paralisadas" },
              { id: "baixadas", label: "Baixadas" },
              { id: "entregue", label: "Entregues" }
            ].map(t => (
              <button
                key={t.id}
                className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-lg scale-[1.01]" : "text-muted-foreground hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5"}`}
                onClick={() => setActiveTab(t.id as any)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="bg-black/[0.03] dark:bg-white/[0.02] border border-border/10 rounded-[2.5rem] shadow-inner p-1 pb-4 relative">
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_60px] px-6 py-4 text-[10px] font-black uppercase text-muted-foreground/60 mb-0 relative z-20">
            <span>Empresa</span>
            <span>CNPJ</span>
            <span>Cadastro</span>
            <span className="text-center">Vencimento</span>
            <span className="text-right pr-2">Ações</span>
          </div>

          <div className="space-y-3 px-1 relative z-10">
            {filtered.map(emp => {
              const isOpen = expanded === emp.id;
              const proc = emp.proc as ProcuracaoRecord;
              const isVencida = emp.status === "vencida";
              const isProxima = emp.status === "proxima";
              const isAtiva = emp.status === "ativa";

              const customHeader = (
                <div className="md:grid md:grid-cols-[2.2fr_1fr_1fr_1fr_60px] items-center w-full py-1 gap-6">
                  {/* Empresa */}
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
                        ID: {emp.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* CNPJ */}
                  <div className="hidden md:block text-[11px] font-black text-muted-foreground/60 font-mono tracking-tighter">
                    {emp.cnpj}
                  </div>

                  {/* Cadastro */}
                  <div className="hidden md:block text-[11px] font-black text-muted-foreground/60">
                    {proc.data_cadastro ? formatDateBR(proc.data_cadastro) : "—"}
                  </div>

                  {/* Vencimento / Status */}
                  <div className="hidden md:flex justify-center">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm",
                      isVencida ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        isProxima ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          isAtiva ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                            "bg-black/5 text-muted-foreground border-border/10"
                    )}>
                      {isVencida ? "VENCIDA" : isProxima ? "PRÓXIMA" : isAtiva ? "ATIVA" : "SEM DADOS"}
                    </span>
                  </div>

                  {/* Ações */}
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
                  nome_empresa={emp.nome_empresa}
                  icon={<Building2 size={20} />}
                >
                  <div className="max-w-6xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Tabs value={rowTabs[emp.id] || "dados"} onValueChange={(v) => setRowTabs(prev => ({ ...prev, [emp.id]: v as any }))} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border/10 pb-3">
                        <TabsList className="bg-black/10 dark:bg-white/10 p-0.5 rounded-xl h-9 border border-border/10 shadow-inner">
                          <TabsTrigger value="dados" className="px-6 h-7 text-[11px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Dados da Procuração</TabsTrigger>
                          <TabsTrigger value="pastas" className="px-6 h-7 text-[11px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Pastas</TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="dados" className="space-y-4 outline-none">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-card p-3 rounded-xl border border-border/10 shadow-sm transition-all hover:border-primary/20 group/input">
                            <span className="block text-[10px] uppercase text-foreground font-black tracking-widest mb-1 group-focus-within/input:text-primary transition-colors">Data de Cadastro</span>
                            <input
                              type="date"
                              value={editForm[emp.id]?.data_cadastro || ""}
                              onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], data_cadastro: e.target.value } }))}
                              className="w-full bg-transparent text-[12px] font-bold outline-none text-foreground"
                            />
                          </div>

                          <div className="bg-card p-3 rounded-xl border border-border/10 shadow-sm transition-all hover:border-primary/20 group/input">
                            <span className="block text-[10px] uppercase text-foreground font-black tracking-widest mb-1 group-focus-within/input:text-primary transition-colors">Data de Vencimento</span>
                            <input
                              type="date"
                              value={editForm[emp.id]?.data_vencimento || ""}
                              onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], data_vencimento: e.target.value } }))}
                              className="w-full bg-transparent text-[12px] font-bold outline-none text-foreground"
                            />
                          </div>

                          <div className="bg-card p-3 rounded-xl border border-border/10 shadow-sm transition-all hover:border-primary/20 group/input">
                            <span className="block text-[10px] uppercase text-foreground font-black tracking-widest mb-1 group-focus-within/input:text-primary transition-colors">Observações</span>
                            <input
                              type="text"
                              value={editForm[emp.id]?.observacao || ""}
                              placeholder="Notas sobre portais (e-CAC, SEFAZ...)"
                              onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], observacao: e.target.value } }))}
                              className="w-full bg-transparent text-[12px] font-bold uppercase outline-none text-foreground placeholder-muted-foreground/20"
                            />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/5 flex justify-end">
                          <button onClick={() => handleSave(emp.id)} className="h-9 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 group">
                            <Save size={14} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Gravar</span>
                          </button>
                        </div>
                      </TabsContent>

                      <TabsContent value="pastas" className="animate-in slide-in-from-right-1 duration-200 outline-none">
                        <div className="bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-border/10 p-0.5 overflow-hidden shadow-inner">
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
                <p className="text-[12px] font-black text-foreground uppercase tracking-widest">Nenhuma empresa encontrada no filtro</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcuracoesPage;
