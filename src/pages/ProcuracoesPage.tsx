import React, { useEffect, useState } from "react";
import { db, ref, onValue, update } from "@/lib/firebase";
import { Search, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp, Save, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
}

interface ProcuracaoData {
  dataCadastro?: string;
  dataValidade?: string;
  tipo?: string;
  observacao?: string;
}

const calcDias = (data?: string) => {
  if (!data) return 999;
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
};

const ProcuracoesPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [procData, setProcData] = useState<Record<string, ProcuracaoData>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, ProcuracaoData>>({});

  useEffect(() => {
    const unsub1 = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      setEmpresas(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    const unsub2 = onValue(ref(db, "procuracoes_empresas"), (snap) => {
      setProcData(snap.val() || {});
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const empresasWithProc = empresas.map(emp => {
    const proc = procData[emp.id] || {};
    const dias = calcDias(proc.dataValidade);
    const status = dias === 999 ? "sem_dados" : dias < 0 ? "vencida" : dias <= 30 ? "proxima" : "ativa";
    return { ...emp, proc, dias, status };
  });

  const filtered = empresasWithProc.filter(e => {
    const matchSearch = e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const matchStatus = filterStatus === "todos" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    ativas: empresasWithProc.filter(e => e.status === "ativa").length,
    proximas: empresasWithProc.filter(e => e.status === "proxima").length,
    vencidas: empresasWithProc.filter(e => e.status === "vencida").length,
    semDados: empresasWithProc.filter(e => e.status === "sem_dados").length,
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const emp = empresasWithProc.find(e => e.id === id);
    if (emp) {
      setEditForm(prev => ({
        ...prev,
        [id]: {
          dataCadastro: emp.proc.dataCadastro || "",
          dataValidade: emp.proc.dataValidade || "",
          tipo: emp.proc.tipo || "ecac",
          observacao: emp.proc.observacao || "",
        }
      }));
    }
  };

  const handleSave = async (empresaId: string) => {
    try {
      await update(ref(db, `procuracoes_empresas/${empresaId}`), editForm[empresaId]);
      toast.success("Procuração atualizada!");
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-card-foreground">Procurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Controle de procurações de todas as empresas cadastradas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ativas", count: counts.ativas, cls: "text-success", bg: "bg-success/10", icon: <CheckCircle size={20} /> },
          { label: "Próximas", count: counts.proximas, cls: "text-warning", bg: "bg-warning/10", icon: <Clock size={20} /> },
          { label: "Vencidas", count: counts.vencidas, cls: "text-destructive", bg: "bg-destructive/10", icon: <AlertTriangle size={20} /> },
          { label: "Sem Dados", count: counts.semDados, cls: "text-muted-foreground", bg: "bg-muted", icon: <AlertTriangle size={20} /> },
        ].map(s => (
          <div key={s.label} className="stat-card flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.count}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.cls}`}>{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ key: "todos", label: "Todos" }, { key: "ativa", label: "Ativas" }, { key: "proxima", label: "Próximas" }, { key: "vencida", label: "Vencidas" }, { key: "sem_dados", label: "Sem Dados" }].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="module-card text-center py-12 text-muted-foreground">Nenhuma empresa encontrada</div>
        ) : filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const form = editForm[emp.id] || {};
          const statusCls = emp.status === "vencida" ? "badge-danger" : emp.status === "proxima" ? "badge-warning" : emp.status === "ativa" ? "badge-success" : "badge-gray";
          const statusLabel = emp.status === "vencida" ? "Vencida" : emp.status === "proxima" ? "Próxima" : emp.status === "ativa" ? "Ativa" : "Sem dados";

          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{emp.nomeEmpresa}</p>
                    <p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {emp.proc.dataValidade && <span className="text-xs text-muted-foreground">Venc: {new Date(emp.proc.dataValidade).toLocaleDateString("pt-BR")}</span>}
                  <span className={`badge-status ${statusCls}`}>{statusLabel}</span>
                  {emp.dias !== 999 && <span className="text-xs text-muted-foreground">{emp.dias}d</span>}
                  {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-5 space-y-4 bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Tipo</label>
                      <select value={form.tipo || "ecac"} onChange={e => updateForm(emp.id, "tipo", e.target.value)} className={inputCls}>
                        <option value="ecac">e-CAC</option>
                        <option value="prefeitura">Prefeitura</option>
                        <option value="estado">Estado</option>
                        <option value="judicial">Judicial</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Data de Cadastro</label>
                      <input type="date" value={form.dataCadastro || ""} onChange={e => updateForm(emp.id, "dataCadastro", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Data de Validade</label>
                      <input type="date" value={form.dataValidade || ""} onChange={e => updateForm(emp.id, "dataValidade", e.target.value)} className={inputCls} />
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

export default ProcuracoesPage;
