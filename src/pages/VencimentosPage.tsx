import React, { useEffect, useState } from "react";
import { formatCurrency, formatDateBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertTriangle, CheckCircle, Search } from "lucide-react";
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
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <h1 className="header-title">Controle de <span className="text-primary/90">Vencimentos</span></h1>
             <FavoriteToggleButton moduleId="vencimentos" />
          </div>
          <p className="subtitle-premium">Acompanhamento centralizado de prazos, licenças, certificados e certidões do grupo.</p>
        </div>
      </div>

      {/* Situation Tabs (Ativas, MEI, etc) */}
      <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar max-w-fit shadow-sm">
        {[
          { key: "ativas", label: "Empresas Ativas" },
          { key: "mei", label: "Microempreendedores (MEI)" },
          { key: "paralisadas", label: "Paralisadas" },
          { key: "baixadas", label: "Baixadas" },
          { key: "entregue", label: "Entregues" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveStatusTab(tab.key as any)}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeStatusTab === tab.key ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Stats Grid - Acting as Status Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { key: "vencido", label: "Títulos Vencidos", count: counts.vencido, cls: "text-destructive", bg: "bg-destructive/5", icon: <AlertTriangle size={24} /> },
          { key: "próximo", label: "Vencimentos Próximos", count: counts.proximo, cls: "text-amber-500", bg: "bg-amber-500/5", icon: <Clock size={24} /> },
          { key: "em dia", label: "Prazos Vigentes", count: counts.emDia, cls: "text-emerald-500", bg: "bg-emerald-500/5", icon: <CheckCircle size={24} /> }
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`group bg-card border rounded-[2rem] p-8 flex items-center justify-between transition-all duration-500 ${filter === s.key ? "border-primary/40 shadow-2xl shadow-primary/5 ring-1 ring-primary/20 scale-[1.02]" : "border-border/60 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"}`}
          >
            <div className="text-left space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{s.label}</p>
              <p className={`text-4xl font-black tracking-tight ${s.cls}`}>{s.count}</p>
            </div>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${s.bg} ${s.cls} border border-current/10 group-hover:scale-110 transition-transform duration-500`}>
              {s.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Enhanced Filters Section */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="PESQUISAR POR CLIENTE OU NATUREZA DO VENCIMENTO..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-16 pl-14 pr-8 bg-card border border-border/60 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm group-hover:border-primary/20"
          />
        </div>
        
        <div className="flex gap-4 w-full lg:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 lg:w-64 h-16 px-6 bg-card border border-border/60 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="todos">FILTRAR POR CATEGORIA</option>
            <option value="certificado">CERTIFICADOS DIGITAIS</option>
            <option value="licença">LICENÇAS DE FUNCIONAMENTO</option>
            <option value="taxa">TAXAS E EMOLUMENTOS</option>
            <option value="certidão">CERTIDÕES NEGATIVAS (CND)</option>
            <option value="procuração">PROCURAÇÕES ELETRÔNICAS</option>
          </select>

          <button
            onClick={() => {setFilter("todos"); setCategoryFilter("todos");}}
            className="h-16 px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border/60"
          >
            RESTAURAR
          </button>
        </div>
      </div>

      {/* Vencimentos List - Mobile Card Grid Pattern */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
        {searchFiltered.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-card border-2 border-dashed border-border/40 rounded-[2.5rem] opacity-40">
             <Clock size={48} className="mx-auto mb-4 text-muted-foreground" />
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhum vencimento identificado nos filtros atuais</p>
          </div>
        ) : (
          searchFiltered.map((v, i) => {
            const isVencido = v.status === "vencido";
            const isProximo = v.status === "próximo";
            
            return (
              <div key={i} className="group bg-card border border-border/60 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 rounded-[2rem] p-8 transition-all duration-500 flex flex-col justify-between gap-6 relative overflow-hidden">
                {/* Visual indicator for status */}
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 transition-colors ${isVencido ? 'bg-destructive' : isProximo ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <span className={`h-8 flex items-center px-4 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            isVencido ? 'bg-destructive/10 border-destructive/20 text-destructive' : 
                            isProximo ? 'bg-amber-50 border-amber-200 text-amber-600' : 
                            'bg-emerald-50 border-emerald-200 text-emerald-600'
                        }`}>
                            {isVencido ? "EXPIRADO" : isProximo ? "VENCE LOGO" : "VIGENTE"}
                        </span>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expira em</p>
                            <p className="font-ubuntu font-bold text-sm text-card-foreground">{formatDateBR(v.data)}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-black text-sm text-card-foreground uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1">{v.empresa}</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 w-fit">
                            {v.tipo}
                        </p>
                    </div>
                </div>

                <div className="pt-6 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isVencido ? 'bg-destructive/10 text-destructive' : isProximo ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                             {isVencido ? <AlertTriangle size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                             <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Contagem</p>
                             <p className={`text-sm font-black ${isVencido ? 'text-destructive' : 'text-card-foreground'}`}>
                                {isVencido ? `${Math.abs(v.diasRestantes)}d atrasado` : `${v.diasRestantes} dias restantes`}
                             </p>
                        </div>
                    </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VencimentosPage;
