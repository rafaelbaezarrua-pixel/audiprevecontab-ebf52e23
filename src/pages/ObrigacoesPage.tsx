import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nome_empresa: string;
  cnpj: string | null;
  situacao: string | null;
  regime_tributario: string | null;
}

const obrigacoesSimples = ["PGDAS-D", "DEFIS", "DCTF Web", "eSocial", "EFD-Reinf", "DIRF", "RAIS"];
const obrigacoesLucro = ["DCTF", "ECD", "ECF", "SPED Fiscal", "SPED Contribuições", "DCTF Web", "eSocial", "EFD-Reinf", "DIRF", "RAIS", "GFIP"];

type ObrigacaoStatus = Record<string, boolean>;

const ObrigacoesPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ObrigacaoStatus>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("empresas").select("*").neq("situacao", "baixada");
      if (data) setEmpresas(data);
    };
    load();
  }, []);

  const filtered = empresas.filter(e => e.nome_empresa?.toLowerCase().includes(search.toLowerCase()));

  const getObrigacoes = (regime: string | null) => {
    if (regime === "simples" || regime === "mei") return obrigacoesSimples;
    return obrigacoesLucro;
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!statuses[id]) {
      const emp = empresas.find(e => e.id === id);
      const obrigacoes = getObrigacoes(emp?.regime_tributario || "simples");
      const initial: ObrigacaoStatus = {};
      obrigacoes.forEach(o => { initial[o] = false; });
      setStatuses(prev => ({ ...prev, [id]: initial }));
    }
  };

  const toggleStatus = (empresaId: string, obrigacao: string) => {
    setStatuses(prev => ({
      ...prev,
      [empresaId]: { ...prev[empresaId], [obrigacao]: !prev[empresaId]?.[obrigacao] }
    }));
  };

  const getProgress = (empresaId: string) => {
    const s = statuses[empresaId];
    if (!s) return 0;
    const vals = Object.values(s);
    if (vals.length === 0) return 0;
    return Math.round((vals.filter(Boolean).length / vals.length) * 100);
  };

  const totalCompleted = empresas.filter(e => getProgress(e.id) === 100).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Obrigações Acessórias</h1>
          <p className="text-sm text-muted-foreground mt-1">Checklist mensal de obrigações por empresa</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Empresas</p><p className="text-2xl font-bold text-primary mt-1">{empresas.length}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">100% Concluídas</p><p className="text-2xl font-bold text-success mt-1">{totalCompleted}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Pendentes</p><p className="text-2xl font-bold text-warning mt-1">{empresas.length - totalCompleted}</p></div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="module-card text-center py-12 text-muted-foreground">Nenhuma empresa encontrada</div>
        ) : filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const progress = getProgress(emp.id);
          const s = statuses[emp.id] || {};

          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{emp.nome_empresa}</p>
                    <p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{progress}%</span>
                  {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-5 space-y-3 bg-muted/10">
                  {Object.entries(s).map(([obrigacao, done]) => (
                    <div key={obrigacao} className="flex items-center gap-3 p-3 rounded-lg hover:bg-card transition-colors">
                      <button onClick={() => toggleStatus(emp.id, obrigacao)} className="flex-shrink-0">
                        {done ? <CheckCircle size={20} className="text-success" /> : <Circle size={20} className="text-muted-foreground" />}
                      </button>
                      <span className={`text-sm font-medium flex-1 ${done ? "text-muted-foreground line-through" : "text-card-foreground"}`}>{obrigacao}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ObrigacoesPage;
