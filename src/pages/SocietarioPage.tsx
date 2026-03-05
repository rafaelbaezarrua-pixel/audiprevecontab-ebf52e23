import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, Eye, Building2, Filter, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nome_empresa: string;
  cnpj: string | null;
  regime_tributario: string | null;
  situacao: string | null;
  porte_empresa: string | null;
  natureza_juridica: string | null;
  data_abertura: string | null;
  created_at: string | null;
  socios_count?: number;
}

const regimeLabels: Record<string, string> = {
  simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI",
};
const situacaoConfig: Record<string, { label: string; cls: string }> = {
  ativa: { label: "Ativa", cls: "badge-success" },
  paralisada: { label: "Paralisada", cls: "badge-warning" },
  baixada: { label: "Baixada", cls: "badge-danger" },
};

const SocietarioPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [filterSituacao, setFilterSituacao] = useState("todas");
  const [filterRegime, setFilterRegime] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"ativas" | "paralisadas" | "baixadas">("ativas");
  const navigate = useNavigate();

  const fetchEmpresas = async () => {
    const { data, error } = await supabase.from("empresas").select("*").order("nome_empresa");
    if (error) { toast.error(error.message); return; }

    // Get socios counts
    const { data: sociosData } = await supabase.from("socios").select("empresa_id");
    const sociosCounts: Record<string, number> = {};
    sociosData?.forEach(s => { sociosCounts[s.empresa_id] = (sociosCounts[s.empresa_id] || 0) + 1; });

    setEmpresas((data || []).map(e => ({ ...e, socios_count: sociosCounts[e.id] || 0 })));
  };

  useEffect(() => { fetchEmpresas(); }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel("empresas_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "empresas" }, () => fetchEmpresas())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = empresas.filter((e) => {
    // Basic text search and dropdown filters
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const matchSituacao = filterSituacao === "todas" || e.situacao === filterSituacao;
    const matchRegime = filterRegime === "todos" || e.regime_tributario === filterRegime;

    // Tab filter
    let matchTab = false;
    if (activeTab === "ativas") {
      matchTab = !e.situacao || e.situacao === "ativa";
    } else if (activeTab === "paralisadas") {
      matchTab = e.situacao === "paralisada";
    } else if (activeTab === "baixadas") {
      matchTab = e.situacao === "baixada";
    }

    return matchSearch && matchSituacao && matchRegime && matchTab;
  });

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a empresa "${nome}"? Essa ação afetará todos os módulos.`)) return;
    const { error } = await supabase.from("empresas").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else toast.success("Empresa excluída com sucesso!");
  };

  const stats = {
    total: empresas.length,
    ativas: empresas.filter(e => !e.situacao || e.situacao === "ativa").length,
    paralisadas: empresas.filter(e => e.situacao === "paralisada").length,
    baixadas: empresas.filter(e => e.situacao === "baixada").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Departamento Societário</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as empresas do escritório contábil</p>
        </div>
        <button onClick={() => navigate("/societario/nova")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shadow-md hover:shadow-lg transition-all" style={{ background: "var(--gradient-primary)" }}>
          <Plus size={18} /> Nova Empresa
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: <Building2 size={20} />, color: "text-primary" },
          { label: "Ativas", value: stats.ativas, cls: "badge-success" },
          { label: "Paralisadas", value: stats.paralisadas, cls: "badge-warning" },
          { label: "Baixadas", value: stats.baixadas, cls: "badge-danger" },
        ].map((s) => (
          <div key={s.label} className="stat-card flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold text-card-foreground mt-1">{s.value}</p>
            </div>
            {s.cls && <span className={`badge-status ${s.cls} text-lg px-4 py-2`}>{s.value}</span>}
            {s.icon && <span className={s.color}>{s.icon}</span>}
          </div>
        ))}
      </div>

      <div className="module-card">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${showFilters ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <Filter size={16} /> Filtros <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Situação</label>
              <select value={filterSituacao} onChange={(e) => setFilterSituacao(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                <option value="todas">Todas</option>
                <option value="ativa">Ativa</option>
                <option value="paralisada">Paralisada</option>
                <option value="baixada">Baixada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Regime Tributário</label>
              <select value={filterRegime} onChange={(e) => setFilterRegime(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                <option value="todos">Todos</option>
                <option value="simples">Simples Nacional</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
                <option value="mei">MEI</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b border-border overflow-x-auto no-scrollbar">
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "ativas"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("ativas")}
        >
          Empresas Ativas
        </button>
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "paralisadas"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("paralisadas")}
        >
          Empresas Paralisadas
        </button>
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "baixadas"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("baixadas")}
        >
          Empresas Baixadas
        </button>
      </div>

      <div className="module-card overflow-x-auto p-0">
        <table className="data-table">
          <thead>
            <tr><th>Empresa</th><th>CNPJ</th><th>Regime</th><th>Situação</th><th>Sócios</th><th className="text-right">Ações</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><Building2 size={40} className="mx-auto mb-3 opacity-30" /><p className="font-medium">Nenhuma empresa encontrada</p></td></tr>
            ) : filtered.map((emp) => {
              const sit = situacaoConfig[emp.situacao || "ativa"] || situacaoConfig.ativa;
              return (
                <tr key={emp.id} className="cursor-pointer" onClick={() => navigate(`/societario/${emp.id}`)}>
                  <td><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 size={16} className="text-primary" /></div><span className="font-medium text-card-foreground">{emp.nome_empresa}</span></div></td>
                  <td className="text-muted-foreground font-mono text-xs">{emp.cnpj || "—"}</td>
                  <td className="text-muted-foreground">{regimeLabels[emp.regime_tributario || ""] || "—"}</td>
                  <td><span className={`badge-status ${sit.cls}`}>{sit.label}</span></td>
                  <td className="text-muted-foreground">{emp.socios_count || 0}</td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/societario/${emp.id}`)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary" title="Visualizar"><Eye size={15} /></button>
                      <button onClick={() => handleDelete(emp.id, emp.nome_empresa)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Excluir"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SocietarioPage;
