import React, { useEffect, useState } from "react";
import { db, ref, onValue, update } from "@/lib/firebase";
import { Search, ChevronDown, ChevronUp, Save, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
  situacao: string;
}

interface HonorarioData {
  valor?: number;
  status?: string; // pendente | pago
  dataPagamento?: string;
  observacao?: string;
}

const HonorariosPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [honData, setHonData] = useState<Record<string, HonorarioData>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, HonorarioData>>({});

  useEffect(() => {
    const unsub = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      setEmpresas(Object.entries(data).map(([id, val]: any) => ({ id, ...val })).filter((e: Empresa) => e.situacao !== "baixada"));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, `honorarios_mensal/${competencia}`), (snap) => {
      setHonData(snap.val() || {});
    });
    return () => unsub();
  }, [competencia]);

  const filtered = empresas.filter(e => e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()));

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const current = honData[id] || {};
    setEditForm(prev => ({
      ...prev,
      [id]: {
        valor: current.valor || 0,
        status: current.status || "pendente",
        dataPagamento: current.dataPagamento || "",
        observacao: current.observacao || "",
      }
    }));
  };

  const handleSave = async (empresaId: string) => {
    try {
      await update(ref(db, `honorarios_mensal/${competencia}/${empresaId}`), editForm[empresaId]);
      toast.success("Honorário salvo!");
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const totalPendente = Object.entries(honData).reduce((a, [, v]) => a + (v.status !== "pago" ? (v.valor || 0) : 0), 0);
  const totalPago = Object.entries(honData).reduce((a, [, v]) => a + (v.status === "pago" ? (v.valor || 0) : 0), 0);

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Honorários</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle mensal de honorários por empresa</p>
        </div>
        <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Pendente</p><p className="text-2xl font-bold text-warning mt-1">R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Recebido</p><p className="text-2xl font-bold text-success mt-1">R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
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
          const form = editForm[emp.id] || {};
          const current = honData[emp.id] || {};
          const isPago = current.status === "pago";

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
                  {current.valor ? <span className="text-sm font-medium text-card-foreground">R$ {(current.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span> : null}
                  <span className={`badge-status ${isPago ? "badge-success" : "badge-warning"}`}>{isPago ? "Pago" : "Pendente"}</span>
                  {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-5 space-y-4 bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Valor do Honorário</label>
                      <input type="number" step="0.01" value={form.valor || ""} onChange={e => updateForm(emp.id, "valor", parseFloat(e.target.value) || 0)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select value={form.status || "pendente"} onChange={e => updateForm(emp.id, "status", e.target.value)} className={inputCls}>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Data do Pagamento</label>
                      <input type="date" value={form.dataPagamento || ""} onChange={e => updateForm(emp.id, "dataPagamento", e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Observação</label>
                    <textarea value={form.observacao || ""} onChange={e => updateForm(emp.id, "observacao", e.target.value)} className={inputCls} rows={2} />
                  </div>
                  <div className="flex justify-end">
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

export default HonorariosPage;
