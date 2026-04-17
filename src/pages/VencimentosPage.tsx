import React, { useEffect, useState } from "react";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertTriangle, CheckCircle, Search, LayoutGrid, List } from "lucide-react";
import { useEmpresas } from "@/hooks/useEmpresas";
import { LicencaTaxaRecord, CertidaoRecord } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

interface Vencimento { empresa: string; tipo: string; data: string; diasRestantes: number; status: string; empresa_situacao?: string; empresa_porte?: string; }

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

      // Licencas com vencimento
      const { data: lics } = await supabase.from("licencas").select("*").eq("status", "com_vencimento").not("vencimento", "is", null);
      lics?.forEach(l => {
        const dias = calcDias(l.vencimento);
        const empInfo = empMap[l.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          empresa: empInfo.nome,
          tipo: `Licença: ${licencaLabels[l.tipo_licenca] || l.tipo_licenca}`,
          data: l.vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte
        });
      });

      // Certificados
      const { data: certs } = await supabase.from("certificados_digitais").select("*").not("data_vencimento", "is", null);
      certs?.forEach(c => {
        const dias = calcDias(c.data_vencimento);
        const empInfo = empMap[c.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          empresa: empInfo.nome,
          tipo: "Certificado Digital",
          data: c.data_vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte
        });
      });

      // Procuracoes
      const { data: procs } = await supabase.from("procuracoes").select("*").not("data_vencimento", "is", null);
      procs?.forEach(p => {
        const dias = calcDias(p.data_vencimento);
        const empInfo = empMap[p.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          empresa: empInfo.nome,
          tipo: "Procuração",
          data: p.data_vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte
        });
      });

      // Certidoes
      const { data: certidoes } = await supabase.from("certidoes").select("*").not("vencimento", "is", null);
      (certidoes as unknown as CertidaoRecord[])?.forEach(c => {
        const dias = calcDias(c.vencimento);
        const empInfo = empMap[c.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          empresa: empInfo.nome,
          tipo: `Certidão: ${c.tipo_certidao}`,
          data: c.vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte
        });
      });

      // Taxas de Licenças
      const { data: taxas } = await (supabase.from("licencas_taxas" as any).select("*").not("data_vencimento", "is", null));
      (taxas as unknown as LicencaTaxaRecord[])?.forEach((t) => {
        const dias = calcDias(t.data_vencimento);
        const empInfo = empMap[t.empresa_id] || { nome: "—", situacao: "", porte: "" };
        list.push({
          empresa: empInfo.nome,
          tipo: `Taxa: ${licencaLabels[t.tipo_licenca] || t.tipo_licenca}`,
          data: t.data_vencimento!,
          diasRestantes: dias,
          status: calcStatus(dias),
          empresa_situacao: empInfo.situacao,
          empresa_porte: empInfo.porte
        });
      });

      list.sort((a, b) => a.diasRestantes - b.diasRestantes);
      setVencimentos(list);
    };
    if (empresas.length > 0) load();
  }, [empresas]);

  const searchFiltered = vencimentos.filter(v => {
    const matchSearch = !search || v.empresa.toLowerCase().includes(search.toLowerCase()) || v.tipo.toLowerCase().includes(search.toLowerCase());
    const matchStatusFilter = filter === "todos" || v.status === filter;

    // Check if category filter matches (e.g. "Certificado Digital" includes "Certificado" or "Licença")
    const matchCategory = categoryFilter === "todos" || v.tipo.toLowerCase().includes(categoryFilter);

    let matchTab = false;
    if (activeStatusTab === "ativas") {
      matchTab = (v.empresa_situacao === "ativa") && v.empresa_porte !== "mei";
    } else if (activeStatusTab === "mei") {
      matchTab = (v.empresa_situacao === "ativa") && v.empresa_porte === "mei";
    } else if (activeStatusTab === "paralisadas") {
      matchTab = v.empresa_situacao === "paralisada";
    } else if (activeStatusTab === "baixadas") {
      matchTab = v.empresa_situacao === "baixada";
    } else if (activeStatusTab === "entregue") {
      matchTab = v.empresa_situacao === "entregue";
    }

    return matchSearch && matchStatusFilter && matchCategory && matchTab;
  });

  const counts = { vencido: vencimentos.filter(v => v.status === "vencido").length, proximo: vencimentos.filter(v => v.status === "próximo").length, emDia: vencimentos.filter(v => v.status === "em dia").length };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <h1 className="header-title">Controle de <span className="text-primary/90 font-black">Vencimentos</span></h1>
             <FavoriteToggleButton moduleId="vencimentos" />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest text-shadow-sm leading-tight">Acompanhamento centralizado de prazos técnicos.</p>
        </div>
        <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 shadow-inner">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}><List size={16} /></button>
        </div>
      </div>

      {/* Situation Tabs (Ativas, MEI, etc) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 shadow-inner">
        <div className="flex overflow-x-auto no-scrollbar gap-1 max-w-full h-9 p-0.5">
          {[
            { key: "ativas", label: "Ativas" },
            { key: "mei", label: "MEI" },
            { key: "paralisadas", label: "Paralisadas" },
            { key: "baixadas", label: "Baixadas" },
            { key: "entregue", label: "Entregues" }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveStatusTab(tab.key as any)}
              className={`px-6 h-full rounded-md text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeStatusTab === tab.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid - Acting as Status Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: "vencido", label: "Expirados", count: counts.vencido, cls: "text-rose-500", bg: "bg-rose-500/10", icon: <AlertTriangle size={18} /> },
          { key: "próximo", label: "Vence Logo", count: counts.proximo, cls: "text-amber-500", bg: "bg-amber-500/10", icon: <Clock size={18} /> },
          { key: "em dia", label: "Vigentes", count: counts.emDia, cls: "text-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle size={18} /> }
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`group bg-black/10 dark:bg-white/5 border rounded-2xl h-16 flex items-center justify-between px-6 transition-all duration-300 shadow-inner ${filter === s.key ? "border-primary/50 shadow-xl shadow-primary/10 ring-1 ring-primary/20 bg-card" : "border-border/10 hover:border-border/30 hover:bg-black/20"}`}
          >
            <div className="text-left flex items-center gap-4">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.cls} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                 {s.icon}
               </div>
               <div>
                  <p className="text-[8px] text-muted-foreground/50 uppercase font-black tracking-widest">{s.label}</p>
                  <p className={`text-[16px] font-black tracking-tight ${filter === s.key ? s.cls : 'text-foreground'}`}>{s.count}</p>
               </div>
            </div>
          </button>
        ))}
      </div>

      {/* Enhanced Filters Section */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="PESQUISAR CLIENTE OU VENCIMENTO..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-12 pr-6 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-inner placeholder:text-muted-foreground/30"
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-56 h-10 px-4 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-inner appearance-none cursor-pointer"
          >
            <option value="todos">TUDO</option>
            <option value="certificado">CERTIFICADOS DIGITAIS</option>
            <option value="licença">LICENÇAS DE FUNCIONAMENTO</option>
            <option value="taxa">TAXAS E EMOLUMENTOS</option>
            <option value="certidão">CERTIDÕES NEGATIVAS</option>
            <option value="procuração">PROCURAÇÕES</option>
          </select>

          <button
            onClick={() => {setFilter("todos"); setCategoryFilter("todos"); setSearch("");}}
            className="h-10 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-black/10 dark:bg-white/5 text-muted-foreground/50 hover:bg-black/20 hover:text-foreground border border-border/10 shadow-inner"
            title="Limpar Filtros"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Vencimentos List/Grid */}
      {searchFiltered.length === 0 ? (
          <div className="py-32 text-center bg-card border-2 border-dashed border-border/40 rounded-[2.5rem] opacity-40">
             <Clock size={48} className="mx-auto mb-4 text-muted-foreground" />
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhum vencimento identificado nos filtros atuais</p>
          </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {searchFiltered.map((v, i) => {
            const isVencido = v.status === "vencido";
            const isProximo = v.status === "próximo";
            return (
              <div key={i} className="group bg-card border border-border/60 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 rounded-[2rem] p-8 transition-all duration-500 flex flex-col justify-between gap-6 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 transition-colors ${isVencido ? 'bg-destructive' : isProximo ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <span className={`h-8 flex items-center px-4 rounded-full text-[9px] font-black uppercase tracking-widest border ${isVencido ? 'bg-destructive/10 border-destructive/20 text-destructive' : isProximo ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                            {isVencido ? "EXPIRADO" : isProximo ? "VENCE LOGO" : "VIGENTE"}
                        </span>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expira em</p>
                            <p className="font-ubuntu font-bold text-sm text-card-foreground">{formatDateBR(v.data)}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-black text-sm text-card-foreground uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1">{v.empresa}</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 w-fit">{v.tipo}</p>
                    </div>
                </div>
                <div className="pt-6 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isVencido ? 'bg-destructive/10 text-destructive' : isProximo ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                             {isVencido ? <AlertTriangle size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                             <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Contagem</p>
                             <p className={`text-sm font-black ${isVencido ? 'text-destructive' : 'text-card-foreground'}`}>{isVencido ? `${Math.abs(v.diasRestantes)}d atrasado` : `${v.diasRestantes} dias restantes`}</p>
                        </div>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-muted/30 border-b border-border/60">
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Empresa</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vencimento</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dias</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {searchFiltered.map((v, i) => {
                        const isVencido = v.status === "vencido";
                        const isProximo = v.status === "próximo";
                        return (
                        <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors group">
                            <td className="px-6 py-4 font-black text-[11px] uppercase tracking-tight text-card-foreground max-w-[220px]">
                                <span className="block truncate group-hover:text-primary transition-colors">{v.empresa}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2.5 py-1 rounded-md border border-primary/10 whitespace-nowrap">{v.tipo}</span>
                            </td>
                            <td className="px-6 py-4 text-[11px] font-bold text-card-foreground whitespace-nowrap">{formatDateBR(v.data)}</td>
                            <td className={`px-6 py-4 text-[11px] font-black whitespace-nowrap ${isVencido ? "text-destructive" : "text-card-foreground"}`}>
                                {isVencido ? `${Math.abs(v.diasRestantes)}d atrasado` : `${v.diasRestantes} dias`}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`h-7 inline-flex items-center px-3 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    isVencido ? "bg-destructive/10 border-destructive/20 text-destructive" :
                                    isProximo ? "bg-amber-50 border-amber-200 text-amber-600" :
                                    "bg-emerald-50 border-emerald-200 text-emerald-600"
                                }`}>
                                    {isVencido ? "Expirado" : isProximo ? "Vence Logo" : "Vigente"}
                                </span>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default VencimentosPage;
