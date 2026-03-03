import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertTriangle, CheckCircle, Search } from "lucide-react";

interface Vencimento { empresa: string; tipo: string; data: string; diasRestantes: number; status: string; }

const calcDias = (data?: string | null) => { if (!data) return 999; return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); };
const calcStatus = (dias: number) => dias < 0 ? "vencido" : dias <= 30 ? "próximo" : "em dia";

const licencaLabels: Record<string, string> = { alvara: "Alvará", vigilancia_sanitaria: "Vigilância Sanitária", corpo_bombeiros: "Corpo de Bombeiros", meio_ambiente: "Meio Ambiente" };

const VencimentosPage: React.FC = () => {
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const list: Vencimento[] = [];
      const { data: empresas } = await supabase.from("empresas").select("id, nome_empresa");
      const empMap: Record<string, string> = {};
      empresas?.forEach(e => { empMap[e.id] = e.nome_empresa; });

      // Licencas com vencimento
      const { data: lics } = await supabase.from("licencas").select("*").eq("status", "com_vencimento").not("vencimento", "is", null);
      lics?.forEach(l => { const dias = calcDias(l.vencimento); list.push({ empresa: empMap[l.empresa_id] || "—", tipo: `Licença: ${licencaLabels[l.tipo_licenca] || l.tipo_licenca}`, data: l.vencimento!, diasRestantes: dias, status: calcStatus(dias) }); });

      // Certificados
      const { data: certs } = await supabase.from("certificados_digitais").select("*").not("data_vencimento", "is", null);
      certs?.forEach(c => { const dias = calcDias(c.data_vencimento); list.push({ empresa: empMap[c.empresa_id] || "—", tipo: "Certificado Digital", data: c.data_vencimento!, diasRestantes: dias, status: calcStatus(dias) }); });

      // Procuracoes
      const { data: procs } = await supabase.from("procuracoes").select("*").not("data_vencimento", "is", null);
      procs?.forEach(p => { const dias = calcDias(p.data_vencimento); list.push({ empresa: empMap[p.empresa_id] || "—", tipo: "Procuração", data: p.data_vencimento!, diasRestantes: dias, status: calcStatus(dias) }); });

      // Certidoes
      const { data: certidoes } = await supabase.from("certidoes").select("*").not("vencimento", "is", null);
      certidoes?.forEach(c => { const dias = calcDias(c.vencimento); list.push({ empresa: empMap[c.empresa_id] || "—", tipo: `Certidão: ${c.tipo_certidao}`, data: c.vencimento!, diasRestantes: dias, status: calcStatus(dias) }); });

      list.sort((a, b) => a.diasRestantes - b.diasRestantes);
      setVencimentos(list);
    };
    load();
  }, []);

  const searchFiltered = vencimentos.filter(v => {
    const matchSearch = !search || v.empresa.toLowerCase().includes(search.toLowerCase()) || v.tipo.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filter === "todos" || v.status === filter);
  });

  const counts = { vencido: vencimentos.filter(v => v.status === "vencido").length, proximo: vencimentos.filter(v => v.status === "próximo").length, emDia: vencimentos.filter(v => v.status === "em dia").length };

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-card-foreground">Vencimentos</h1><p className="text-sm text-muted-foreground mt-1">Visão consolidada de todos os vencimentos</p></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card flex items-center justify-between cursor-pointer" onClick={() => setFilter("vencido")}><div><p className="text-xs text-muted-foreground uppercase">Vencidos</p><p className="text-2xl font-bold text-destructive mt-1">{counts.vencido}</p></div><AlertTriangle className="text-destructive" size={22} /></div>
        <div className="stat-card flex items-center justify-between cursor-pointer" onClick={() => setFilter("próximo")}><div><p className="text-xs text-muted-foreground uppercase">Próximos</p><p className="text-2xl font-bold text-warning mt-1">{counts.proximo}</p></div><Clock className="text-warning" size={22} /></div>
        <div className="stat-card flex items-center justify-between cursor-pointer" onClick={() => setFilter("em dia")}><div><p className="text-xs text-muted-foreground uppercase">Em Dia</p><p className="text-2xl font-bold text-success mt-1">{counts.emDia}</p></div><CheckCircle className="text-success" size={22} /></div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
        <div className="flex gap-2">{["todos", "vencido", "próximo", "em dia"].map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>))}</div>
      </div>
      <div className="module-card overflow-x-auto">
        <table className="data-table"><thead><tr><th>Empresa</th><th>Tipo</th><th>Vencimento</th><th>Dias</th><th>Status</th></tr></thead>
          <tbody>{searchFiltered.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum vencimento</td></tr> : searchFiltered.map((v, i) => (
            <tr key={i}><td className="font-medium text-card-foreground">{v.empresa}</td><td className="text-muted-foreground">{v.tipo}</td><td className="text-muted-foreground">{new Date(v.data).toLocaleDateString("pt-BR")}</td><td className="text-card-foreground font-medium">{v.diasRestantes}d</td><td><span className={`badge-status ${v.status === "vencido" ? "badge-danger" : v.status === "próximo" ? "badge-warning" : "badge-success"}`}>{v.status}</span></td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};

export default VencimentosPage;
