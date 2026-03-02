import React, { useEffect, useState } from "react";
import { db, ref, onValue, update } from "@/lib/firebase";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
  situacao: string;
  regimeTributario: string;
}

interface ObrigacaoItem {
  status: string; // pendente | concluida
  responsavel?: string;
  dataEntrega?: string;
}

type ObrigacaoData = Record<string, ObrigacaoItem>;

const obrigacoesSimples = ["PGDAS-D", "DEFIS", "DCTF Web", "eSocial", "EFD-Reinf", "DIRF", "RAIS"];
const obrigacoesLucro = ["DCTF", "ECD", "ECF", "SPED Fiscal", "SPED Contribuições", "DCTF Web", "eSocial", "EFD-Reinf", "DIRF", "RAIS", "GFIP"];

const ObrigacoesPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [obrigData, setObrigData] = useState<Record<string, ObrigacaoData>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, ObrigacaoData>>({});

  useEffect(() => {
    const unsub = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      setEmpresas(Object.entries(data).map(([id, val]: any) => ({ id, ...val })).filter((e: Empresa) => e.situacao !== "baixada"));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, `obrigacoes_mensal/${competencia}`), (snap) => {
      setObrigData(snap.val() || {});
    });
    return () => unsub();
  }, [competencia]);

  const filtered = empresas.filter(e => e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()));

  const getObrigacoes = (regime: string) => {
    if (regime === "simples" || regime === "mei") return obrigacoesSimples;
    return obrigacoesLucro;
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const emp = empresas.find(e => e.id === id);
    const current = obrigData[id] || {};
    const obrigacoes = getObrigacoes(emp?.regimeTributario || "simples");
    const formData: ObrigacaoData = {};
    obrigacoes.forEach(o => {
      formData[o] = current[o] || { status: "pendente", responsavel: "", dataEntrega: "" };
    });
    setEditForm(prev => ({ ...prev, [id]: formData }));
  };

  const toggleStatus = (empresaId: string, obrigacao: string) => {
    setEditForm(prev => ({
      ...prev,
      [empresaId]: {
        ...prev[empresaId],
        [obrigacao]: {
          ...prev[empresaId]?.[obrigacao],
          status: prev[empresaId]?.[obrigacao]?.status === "concluida" ? "pendente" : "concluida"
        }
      }
    }));
  };

  const handleSave = async (empresaId: string) => {
    try {
      await update(ref(db, `obrigacoes_mensal/${competencia}/${empresaId}`), editForm[empresaId]);
      toast.success("Obrigações salvas!");
    } catch (err: any) { toast.error(err.message); }
  };

  const getProgress = (empresaId: string) => {
    const data = obrigData[empresaId] || {};
    const items = Object.values(data);
    if (items.length === 0) return 0;
    return Math.round((items.filter(i => i.status === "concluida").length / items.length) * 100);
  };

  const totalCompleted = empresas.filter(e => getProgress(e.id) === 100).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Obrigações Acessórias</h1>
          <p className="text-sm text-muted-foreground mt-1">Checklist mensal de obrigações por empresa</p>
        </div>
        <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold" />
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
          const form = editForm[emp.id] || {};

          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{emp.nomeEmpresa}</p>
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
                  {Object.entries(form).map(([obrigacao, item]) => (
                    <div key={obrigacao} className="flex items-center gap-3 p-3 rounded-lg hover:bg-card transition-colors">
                      <button onClick={() => toggleStatus(emp.id, obrigacao)} className="flex-shrink-0">
                        {item.status === "concluida" ? <CheckCircle size={20} className="text-success" /> : <Circle size={20} className="text-muted-foreground" />}
                      </button>
                      <span className={`text-sm font-medium flex-1 ${item.status === "concluida" ? "text-muted-foreground line-through" : "text-card-foreground"}`}>{obrigacao}</span>
                    </div>
                  ))}
                  <div className="flex justify-end pt-3 border-t border-border">
                    <button onClick={() => handleSave(emp.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}>
                      <Save size={14} /> Salvar
                    </button>
                  </div>
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
