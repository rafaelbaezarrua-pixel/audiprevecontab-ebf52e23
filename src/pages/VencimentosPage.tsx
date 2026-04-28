import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertTriangle, CheckCircle, Search, Save, Calendar, Shield, FileText, ChevronDown, ChevronUp, LayoutGrid, List, Building2, FolderOpen } from "lucide-react";
import { useEmpresas } from "@/hooks/useEmpresas";
import { LicencaTaxaRecord, CertidaoRecord } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { EmpresaAccordion } from "@/components/EmpresaAccordion";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Vencimento {
  id: string;
  source: 'licenca' | 'certificado' | 'procuracao' | 'certidao' | 'taxa';
  empresa_id: string;
  empresa: string;
  tipo: string;
  data: string;
  diasRestantes: number;
  status: string;
  empresa_situacao?: string;
  empresa_porte?: string;
  original_tipo_licenca?: string; // For licencas and taxas
}

const calcDias = (data?: string | null) => { if (!data) return 999; return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); };
const calcStatus = (dias: number) => dias < 0 ? "vencido" : dias <= 30 ? "próximo" : "em dia";

const licencaLabels: Record<string, string> = { alvara: "Alvará", vigilancia_sanitaria: "Vigilância Sanitária", corpo_bombeiros: "Corpo de Bombeiros", meio_ambiente: "Meio Ambiente" };

const VencimentosPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("vencimentos");
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [filter, setFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [activeStatusTab, setActiveStatusTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [vencimentosForm, setVencimentosForm] = useState<Record<string, string>>({}); // recordId -> date string

  const handleDateChange = (recordId: string, newDate: string) => {
    setVencimentosForm(prev => ({ ...prev, [recordId]: newDate }));
  };

  const saveVencimento = async (v: Vencimento) => {
    const newDate = vencimentosForm[v.id];
    if (!newDate) return;

    try {
      let error;
      if (v.source === 'licenca') {
        error = (await supabase.from("licencas").update({ vencimento: newDate }).eq("id", v.id)).error;
      } else if (v.source === 'certificado') {
        error = (await supabase.from("certificados_digitais").update({ data_vencimento: newDate }).eq("id", v.id)).error;
      } else if (v.source === 'procuracao') {
        error = (await supabase.from("procuracoes").update({ data_vencimento: newDate }).eq("id", v.id)).error;
      } else if (v.source === 'certidao') {
        error = (await supabase.from("certidoes").update({ vencimento: newDate }).eq("id", v.id)).error;
      } else if (v.source === 'taxa') {
        error = (await supabase.from("licencas_taxas").update({ data_vencimento: newDate }).eq("id", v.id)).error;
      }

      if (error) throw error;
      toast.success("Vencimento atualizado!");

      // Reload to reflect changes
      const { data: empList } = await supabase.from("empresas").select("*"); // Just a dummy to trigger re-load via useEffect dependency if needed, but better call a load function
      // For simplicity, let's just update the local state for now or re-run the effect
      setVencimentos(prev => prev.map(item => item.id === v.id ? { ...item, data: newDate, diasRestantes: calcDias(newDate), status: calcStatus(calcDias(newDate)) } : item));
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
  };

  useEffect(() => {
    const load = async () => {
      const list: Vencimento[] = [];
      const empMap: Record<string, { nome: string; situacao: string; porte: string }> = {};
      empresas.forEach(e => {
        empMap[e.id] = {
          nome: e.nome_empresa,
          situacao: e.situacao || "ativa",
          porte: e.porte_empresa || ""
        };
      });

      // Fetch all sources
      const [licsRes, certsRes, procsRes, certidRes, taxasRes] = await Promise.all([
        supabase.from("licencas").select("*").eq("status", "com_vencimento").not("vencimento", "is", null),
        supabase.from("certificados_digitais").select("*").not("data_vencimento", "is", null),
        supabase.from("procuracoes").select("*").not("data_vencimento", "is", null),
        supabase.from("certidoes").select("*").not("vencimento", "is", null),
        supabase.from("licencas_taxas").select("*").not("data_vencimento", "is", null)
      ]);

      // Process Licenças
      licsRes.data?.forEach(l => {
        const dias = calcDias(l.vencimento);
        const empInfo = empMap[l.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          id: l.id,
          source: 'licenca',
          empresa_id: l.empresa_id,
          empresa: empInfo.nome,
          tipo: `Licença: ${licencaLabels[l.tipo_licenca] || l.tipo_licenca}`,
          data: l.vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte,
          original_tipo_licenca: l.tipo_licenca
        });
      });

      // Process Certificados
      certsRes.data?.forEach(c => {
        const dias = calcDias(c.data_vencimento);
        const empInfo = empMap[c.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          id: c.id,
          source: 'certificado',
          empresa_id: c.empresa_id,
          empresa: empInfo.nome,
          tipo: "Certificado Digital",
          data: c.data_vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte
        });
      });

      // Process Procurações
      procsRes.data?.forEach(p => {
        const dias = calcDias(p.data_vencimento);
        const empInfo = empMap[p.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          id: p.id,
          source: 'procuracao',
          empresa_id: p.empresa_id,
          empresa: empInfo.nome,
          tipo: "Procuração",
          data: p.data_vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte
        });
      });

      // Process Certidões
      (certidRes.data as unknown as CertidaoRecord[])?.forEach(c => {
        const dias = calcDias(c.vencimento);
        const empInfo = empMap[c.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          id: c.id,
          source: 'certidao',
          empresa_id: c.empresa_id,
          empresa: empInfo.nome,
          tipo: `Certidão: ${c.tipo_certidao}`,
          data: c.vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte
        });
      });

      // Process Taxas
      (taxasRes.data as unknown as LicencaTaxaRecord[])?.forEach((t) => {
        const dias = calcDias(t.data_vencimento);
        const empInfo = empMap[t.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          id: t.id,
          source: 'taxa',
          empresa_id: t.empresa_id,
          empresa: empInfo.nome,
          tipo: `Taxa: ${licencaLabels[t.tipo_licenca] || t.tipo_licenca}`,
          data: t.data_vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte,
          original_tipo_licenca: t.tipo_licenca
        });
      });

      list.sort((a, b) => a.diasRestantes - b.diasRestantes);
      setVencimentos(list);
    };
    if (empresas.length > 0) load();
  }, [empresas]);

  const stats = React.useMemo(() => {
    const total = vencimentos.length;
    const expired = vencimentos.filter(v => v.status === "vencido").length;
    const near = vencimentos.filter(v => v.status === "próximo").length;
    return { total, expired, near, ok: total - expired - near };
  }, [vencimentos]);

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

      const companyVencs = vencimentos.filter(v => v.empresa_id === e.id);
      if (companyVencs.length === 0) return false;
      
      let targetVencs = companyVencs;

      if (categoryFilter !== "todos") {
        targetVencs = targetVencs.filter(v => v.tipo.toLowerCase().includes(categoryFilter));
      }

      if (targetVencs.length === 0) return false;

      if (filter !== "todos") {
        const hasStatusMatch = targetVencs.some(v => v.status === filter);
        if (!hasStatusMatch) return false;
      }

      return matchSearch && matchTab;
    });
  }, [empresas, search, activeStatusTab, vencimentos, filter, categoryFilter]);

  const counts = { vencido: vencimentos.filter(v => v.status === "vencido").length, proximo: vencimentos.filter(v => v.status === "próximo").length, emDia: vencimentos.filter(v => v.status === "em dia").length };

  if (loading) {
    return (<div className="space-y-6"><PageHeaderSkeleton /><TableSkeleton rows={8} /></div>);
  }

  return (
    <div className="animate-fade-in relative pb-10">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      <div className="space-y-10">
        {/* Header Standardized */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div className="space-y-1 -mt-2">
            <div className="flex items-center gap-2">
              <h1 className="header-title">Controle de <span className="text-primary/90 font-black">Vencimentos</span></h1>
              <FavoriteToggleButton moduleId="vencimentos" />
            </div>
            <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm">Controle centralizado de vencimentos.</p>
          </div>
        </div>

        {/* Stats & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl overflow-hidden h-10 shrink-0 p-0.5 shadow-inner">
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[8px] text-foreground font-black tracking-wider">Total</span>
                <span className="text-sm font-black">{stats.total}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center border-r border-border/5">
                <span className="text-[8px] text-rose-600 font-black tracking-wider uppercase">Vencidos</span>
                <span className="text-sm font-black text-rose-600">{stats.expired}</span>
              </div>
              <div className="px-4 py-1 flex flex-col justify-center">
                <span className="text-[8px] text-amber-500 font-black tracking-wider uppercase">A Vencer</span>
                <span className="text-sm font-black text-amber-500">{stats.near}</span>
              </div>
            </div>
            <div className="relative flex-1 md:w-[280px] group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
              <input type="text" placeholder="PROCURAR EMPRESA..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 h-10 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl outline-none text-[12px] font-black uppercase focus:ring-1 focus:ring-primary/20 transition-all placeholder:opacity-40 shadow-inner" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 px-4 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-inner cursor-pointer">
              <option value="todos">Todas Categorias</option>
              <option value="certificado">Certificados Digitais</option>
              <option value="licença">Licenças</option>
              <option value="taxa">Taxas</option>
              <option value="certidão">Certidões</option>
              <option value="procuração">Procurações</option>
            </select>
            <div className="flex bg-black/10 dark:bg-white/5 p-0.5 rounded-xl border border-border/10 shrink-0 h-10 items-center shadow-inner">
              {[
                { id: "todos", label: "Geral" },
                { id: "vencido", label: "Vencidos" },
                { id: "próximo", label: "A Vencer" }
              ].map(s => (
                <button key={s.id} onClick={() => setFilter(s.id)} className={`px-4 h-full rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filter === s.id ? "bg-card text-primary shadow-sm" : "text-foreground hover:text-foreground"}`}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Tabs */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-[1.5rem] border border-border/20 shadow-md overflow-hidden">
          <div className="flex p-1 gap-1 border-b border-border/10">
            {[
              { id: "ativas", label: "Ativas" },
              { id: "mei", label: "MEI" },
              { id: "paralisadas", label: "Paralisadas" },
              { id: "baixadas", label: "Baixadas" },
              { id: "entregue", label: "Entregues" }
            ].map(t => (
              <button key={t.id} onClick={() => setActiveStatusTab(t.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeStatusTab === t.id ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>{t.label}</button>
            ))}
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {filtered.map(emp => {
                const isOpen = expanded === emp.id;
                const empVencs = vencimentos.filter(v => v.empresa_id === emp.id);
                const isAtrasado = empVencs.some(v => v.status === "vencido");
                const isNear = empVencs.some(v => v.status === "próximo");

                const renderStatusIndicators = () => (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 rounded-lg border border-border/5">
                      <span className="text-[10px] font-black text-foreground/50">{empVencs.length}</span>
                      <span className="text-[8px] font-black uppercase tracking-tighter text-foreground/40">Prazos</span>
                    </div>
                    {isAtrasado ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-md border border-rose-500/20 animate-pulse">
                        <AlertTriangle size={10} />
                        <span className="text-[9px] font-black uppercase">Vencido</span>
                      </div>
                    ) : isNear ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-md border border-amber-500/20">
                        <Clock size={10} />
                        <span className="text-[9px] font-black uppercase">A Vencer</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md border border-emerald-500/20">
                        <CheckCircle size={10} />
                        <span className="text-[9px] font-black uppercase">Vigente</span>
                      </div>
                    )}
                  </div>
                );

                const customHeader = (
                  <div className="flex items-center justify-between w-full py-1 gap-6">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
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

                    <div className="hidden md:flex items-center gap-6">
                      {renderStatusIndicators()}
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
                    <Tabs defaultValue="vencimentos" className="w-full">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-border/10 pb-3 mb-6">
                        <TabsList className="bg-black/10 dark:bg-white/10 p-0.5 rounded-xl h-9 border border-border/10 shadow-inner">
                          <TabsTrigger value="vencimentos" className="px-6 h-7 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"><Calendar size={14} className="mr-2" /> Painel de Vencimentos</TabsTrigger>
                          <TabsTrigger value="pastas" className="px-6 h-7 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"><FolderOpen size={14} className="mr-2" /> Pastas</TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="vencimentos" className="mt-0">
                        <div className="bg-card/50 rounded-2xl border border-border/10 overflow-hidden">
                          <table className="w-full text-left">
                            <thead className="bg-black/5 dark:bg-white/5 border-b border-border/10">
                              <tr>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Vencimento</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Data Expirada</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/5">
                              {empVencs.map((v, idx) => (
                                <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center border transition-all group-hover:scale-110",
                                        v.status === "vencido" ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                                          v.status === "próximo" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                            "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                      )}>
                                        {v.tipo.includes("Certificado") ? <Shield size={14} /> : v.tipo.includes("Certidão") ? <FileText size={14} /> : <Calendar size={14} />}
                                      </div>
                                      <span className="text-[11px] font-bold uppercase tracking-tight">{v.tipo}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <input
                                        type="date"
                                        value={vencimentosForm[v.id] || v.data}
                                        onChange={(e) => handleDateChange(v.id, e.target.value)}
                                        className="h-8 px-2 bg-black/5 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-primary/20 transition-all w-32"
                                      />
                                      {vencimentosForm[v.id] && vencimentosForm[v.id] !== v.data && (
                                        <button
                                          onClick={() => saveVencimento(v)}
                                          className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm"
                                          title="Salvar alteração"
                                        >
                                          <Save size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                      <span className={cn(
                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                        v.status === "vencido" ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                                          v.status === "próximo" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                            "bg-emerald-500/10 border-emerald-200 text-emerald-600"
                                      )}>
                                        {v.status === "vencido" ? "Vencido" : v.status === "próximo" ? "A Vencer" : "Vigente"}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>

                      <TabsContent value="pastas" className="mt-0">
                        <ModuleFolderView empresa={emp} departamentoId="vencimentos" />
                      </TabsContent>
                    </Tabs>
                  </EmpresaAccordion>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VencimentosPage;
