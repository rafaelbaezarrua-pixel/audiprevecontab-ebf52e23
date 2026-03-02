import React, { useEffect, useState } from "react";
import { db, ref, onValue, update } from "@/lib/firebase";
import { Search, ChevronDown, ChevronUp, Save, Users, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
  situacao: string;
}

interface PessoalData {
  formaEnvio?: string;
  qtdFuncionarios?: number;
  qtdProLabore?: number;
  possuiVT?: boolean;
  possuiVA?: boolean;
  // Encargos VT
  statusGuiaVT?: string;
  dataEnvioVT?: string;
  // Encargos VA
  statusGuiaVA?: string;
  dataEnvioVA?: string;
  // INSS
  statusGuiaINSS?: string;
  dataEnvioINSS?: string;
  // FGTS
  statusGuiaFGTS?: string;
  dataEnvioFGTS?: string;
  // DCTF Web
  dctfWebGerada?: string;
  observacao?: string;
}

const PessoalPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [pessoalData, setPessoalData] = useState<Record<string, PessoalData>>({});
  const [fixedData, setFixedData] = useState<Record<string, PessoalData>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, PessoalData>>({});

  useEffect(() => {
    const unsub = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      setEmpresas(Object.entries(data).map(([id, val]: any) => ({ id, ...val })).filter((e: Empresa) => e.situacao !== "baixada"));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, `pessoal_mensal/${competencia}`), (snap) => {
      setPessoalData(snap.val() || {});
    });
    return () => unsub();
  }, [competencia]);

  useEffect(() => {
    const unsub = onValue(ref(db, "pessoal_info"), (snap) => {
      setFixedData(snap.val() || {});
    });
    return () => unsub();
  }, []);

  const filtered = empresas.filter(e => e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search));

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const fixed = fixedData[id] || {};
    const monthly = pessoalData[id] || {};
    setEditForm(prev => ({
      ...prev,
      [id]: {
        formaEnvio: fixed.formaEnvio || "",
        qtdFuncionarios: fixed.qtdFuncionarios || 0,
        qtdProLabore: fixed.qtdProLabore || 0,
        possuiVT: fixed.possuiVT || false,
        possuiVA: fixed.possuiVA || false,
        statusGuiaVT: monthly.statusGuiaVT || "nao_gerado",
        dataEnvioVT: monthly.dataEnvioVT || "",
        statusGuiaVA: monthly.statusGuiaVA || "nao_gerado",
        dataEnvioVA: monthly.dataEnvioVA || "",
        statusGuiaINSS: monthly.statusGuiaINSS || "nao_gerado",
        dataEnvioINSS: monthly.dataEnvioINSS || "",
        statusGuiaFGTS: monthly.statusGuiaFGTS || "nao_gerado",
        dataEnvioFGTS: monthly.dataEnvioFGTS || "",
        dctfWebGerada: monthly.dctfWebGerada || "nao",
        observacao: monthly.observacao || "",
      }
    }));
  };

  const handleSave = async (empresaId: string) => {
    const form = editForm[empresaId];
    if (!form) return;
    try {
      await update(ref(db, `pessoal_info/${empresaId}`), {
        formaEnvio: form.formaEnvio || "",
        qtdFuncionarios: form.qtdFuncionarios || 0,
        qtdProLabore: form.qtdProLabore || 0,
        possuiVT: form.possuiVT || false,
        possuiVA: form.possuiVA || false,
      });
      const { formaEnvio, qtdFuncionarios, qtdProLabore, possuiVT, possuiVA, ...monthly } = form;
      await update(ref(db, `pessoal_mensal/${competencia}/${empresaId}`), monthly);
      toast.success("Dados do pessoal salvos!");
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const completedCount = empresas.filter(e => {
    const m = pessoalData[e.id];
    return m && m.dctfWebGerada === "sim";
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Departamento Pessoal</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle mensal de folha, encargos e obrigações</p>
        </div>
        <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Empresas</p><p className="text-2xl font-bold text-primary mt-1">{empresas.length}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Concluídas</p><p className="text-2xl font-bold text-success mt-1">{completedCount}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Pendentes</p><p className="text-2xl font-bold text-warning mt-1">{empresas.length - completedCount}</p></div>
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
          const monthly = pessoalData[emp.id] || {};
          const done = monthly.dctfWebGerada === "sim";

          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">
                  {done ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}
                  <div>
                    <p className="font-medium text-card-foreground">{emp.nomeEmpresa}</p>
                    <p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>
                  {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-muted/10">
                  {/* Info fixa */}
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground mb-3">Informações Fixas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <label className={labelCls}>Forma de Envio</label>
                        <input value={form.formaEnvio || ""} onChange={e => updateForm(emp.id, "formaEnvio", e.target.value)} className={inputCls} placeholder="Email, WhatsApp..." />
                      </div>
                      <div>
                        <label className={labelCls}>Qtd Funcionários</label>
                        <input type="number" value={form.qtdFuncionarios || 0} onChange={e => updateForm(emp.id, "qtdFuncionarios", parseInt(e.target.value) || 0)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Qtd Pró-labore</label>
                        <input type="number" value={form.qtdProLabore || 0} onChange={e => updateForm(emp.id, "qtdProLabore", parseInt(e.target.value) || 0)} className={inputCls} />
                      </div>
                      <div className="flex items-end gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={form.possuiVT || false} onChange={e => updateForm(emp.id, "possuiVT", e.target.checked)} className="w-4 h-4 rounded border-border text-primary" />
                          VT
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={form.possuiVA || false} onChange={e => updateForm(emp.id, "possuiVA", e.target.checked)} className="w-4 h-4 rounded border-border text-primary" />
                          VA
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Encargos mensais */}
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground mb-3">Encargos - {competencia}</h3>
                    <div className="space-y-3">
                      {[
                        ...(form.possuiVT ? [{ label: "VT", statusKey: "statusGuiaVT", dateKey: "dataEnvioVT" }] : []),
                        ...(form.possuiVA ? [{ label: "VA", statusKey: "statusGuiaVA", dateKey: "dataEnvioVA" }] : []),
                        { label: "INSS", statusKey: "statusGuiaINSS", dateKey: "dataEnvioINSS" },
                        { label: "FGTS", statusKey: "statusGuiaFGTS", dateKey: "dataEnvioFGTS" },
                      ].map(enc => (
                        <div key={enc.label} className="grid grid-cols-3 gap-3 items-center">
                          <span className="text-sm font-medium text-card-foreground">{enc.label}</span>
                          <select value={(form as any)[enc.statusKey] || "nao_gerado"} onChange={e => updateForm(emp.id, enc.statusKey, e.target.value)} className={inputCls}>
                            <option value="nao_gerado">Não Gerado</option>
                            <option value="gerado">Gerado</option>
                          </select>
                          <input type="date" value={(form as any)[enc.dateKey] || ""} onChange={e => updateForm(emp.id, enc.dateKey, e.target.value)} className={inputCls} />
                        </div>
                      ))}
                      <div className="grid grid-cols-3 gap-3 items-center">
                        <span className="text-sm font-medium text-card-foreground">DCTF Web</span>
                        <select value={form.dctfWebGerada || "nao"} onChange={e => updateForm(emp.id, "dctfWebGerada", e.target.value)} className={inputCls}>
                          <option value="nao">Não Gerada</option>
                          <option value="sim">Gerada</option>
                        </select>
                        <div />
                      </div>
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

export default PessoalPage;
