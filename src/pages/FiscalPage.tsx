import React, { useEffect, useState } from "react";
import { db, ref, onValue, update } from "@/lib/firebase";
import { Search, ChevronDown, ChevronUp, Save, Building2, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
  regimeTributario: string;
  situacao: string;
}

interface FiscalData {
  tipoNota?: string[];
  recebimentoArquivos?: string;
  formaEnvio?: string;
  // Simples Nacional
  aliquota?: string;
  statusGuiaDAS?: string;
  dataEnvioDAS?: string;
  // Lucro Presumido / Real
  statusIRPJ?: string;
  dataEnvioIRPJ?: string;
  statusCSLL?: string;
  dataEnvioCSLL?: string;
  statusPIS?: string;
  dataEnvioPIS?: string;
  statusCOFINS?: string;
  dataEnvioCOFINS?: string;
  statusISS?: string;
  dataEnvioISS?: string;
  statusICMS?: string;
  dataEnvioICMS?: string;
  observacao?: string;
}

const tipoNotaOptions = ["NFE", "NFCE", "NFSE"];
const recebimentoOptions = ["EMAIL", "WHATSAPP", "ISS", "FLY", "COMPROVE", "OUTROS"];
const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI" };

const FiscalPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [fiscalData, setFiscalData] = useState<Record<string, Record<string, FiscalData>>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, FiscalData>>({});

  useEffect(() => {
    const unsub1 = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      setEmpresas(Object.entries(data).map(([id, val]: any) => ({ id, ...val })).filter((e: Empresa) => e.situacao !== "baixada"));
    });
    return () => unsub1();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, `fiscal/${competencia}`), (snap) => {
      setFiscalData(prev => ({ ...prev, [competencia]: snap.val() || {} }));
    });
    return () => unsub();
  }, [competencia]);

  // Also load fixed info
  const [fixedData, setFixedData] = useState<Record<string, FiscalData>>({});
  useEffect(() => {
    const unsub = onValue(ref(db, "fiscal_info"), (snap) => {
      setFixedData(snap.val() || {});
    });
    return () => unsub();
  }, []);

  const currentFiscal = fiscalData[competencia] || {};

  const filtered = empresas.filter(e => e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search));

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const fixed = fixedData[id] || {};
    const monthly = currentFiscal[id] || {};
    setEditForm(prev => ({
      ...prev,
      [id]: {
        tipoNota: fixed.tipoNota || [],
        recebimentoArquivos: fixed.recebimentoArquivos || "",
        formaEnvio: fixed.formaEnvio || "",
        aliquota: monthly.aliquota || "",
        statusGuiaDAS: monthly.statusGuiaDAS || "nao_gerado",
        dataEnvioDAS: monthly.dataEnvioDAS || "",
        statusIRPJ: monthly.statusIRPJ || "nao_gerado",
        dataEnvioIRPJ: monthly.dataEnvioIRPJ || "",
        statusCSLL: monthly.statusCSLL || "nao_gerado",
        dataEnvioCSLL: monthly.dataEnvioCSLL || "",
        statusPIS: monthly.statusPIS || "nao_gerado",
        dataEnvioPIS: monthly.dataEnvioPIS || "",
        statusCOFINS: monthly.statusCOFINS || "nao_gerado",
        dataEnvioCOFINS: monthly.dataEnvioCOFINS || "",
        statusISS: monthly.statusISS || "nao_gerado",
        dataEnvioISS: monthly.dataEnvioISS || "",
        statusICMS: monthly.statusICMS || "nao_gerado",
        dataEnvioICMS: monthly.dataEnvioICMS || "",
        observacao: monthly.observacao || "",
      }
    }));
  };

  const handleSave = async (empresaId: string) => {
    const form = editForm[empresaId];
    if (!form) return;
    try {
      // Save fixed info
      await update(ref(db, `fiscal_info/${empresaId}`), {
        tipoNota: form.tipoNota || [],
        recebimentoArquivos: form.recebimentoArquivos || "",
        formaEnvio: form.formaEnvio || "",
      });
      // Save monthly data
      const { tipoNota, recebimentoArquivos, formaEnvio, ...monthly } = form;
      await update(ref(db, `fiscal/${competencia}/${empresaId}`), monthly);
      toast.success("Dados fiscais salvos!");
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const toggleTipoNota = (empresaId: string, tipo: string) => {
    const current = editForm[empresaId]?.tipoNota || [];
    const next = current.includes(tipo) ? current.filter(t => t !== tipo) : [...current, tipo];
    updateForm(empresaId, "tipoNota", next);
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const completedCount = empresas.filter(e => {
    const m = currentFiscal[e.id];
    if (!m) return false;
    if (e.regimeTributario === "simples" || e.regimeTributario === "mei") return m.statusGuiaDAS === "gerado";
    return m.statusIRPJ === "gerado";
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Departamento Fiscal</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle mensal de impostos por empresa</p>
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
          const isSimples = emp.regimeTributario === "simples" || emp.regimeTributario === "mei";
          const monthly = currentFiscal[emp.id] || {};
          const done = isSimples ? monthly.statusGuiaDAS === "gerado" : monthly.statusIRPJ === "gerado";

          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">
                  {done ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}
                  <div>
                    <p className="font-medium text-card-foreground">{emp.nomeEmpresa}</p>
                    <p className="text-xs text-muted-foreground">{emp.cnpj || "—"} • {regimeLabels[emp.regimeTributario] || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>
                  {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-muted/10">
                  {/* Informações Fixas */}
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground mb-3">Informações Gerais (Fixas)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Tipo de Nota</label>
                        <div className="flex gap-2 flex-wrap">
                          {tipoNotaOptions.map(t => (
                            <button key={t} onClick={() => toggleTipoNota(emp.id, t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${(form.tipoNota || []).includes(t) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Recebimento de Arquivos</label>
                        <select value={form.recebimentoArquivos || ""} onChange={e => updateForm(emp.id, "recebimentoArquivos", e.target.value)} className={inputCls}>
                          <option value="">Selecione</option>
                          {recebimentoOptions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Forma de Envio (Padrão)</label>
                        <input value={form.formaEnvio || ""} onChange={e => updateForm(emp.id, "formaEnvio", e.target.value)} className={inputCls} placeholder="Ex: Email, WhatsApp..." />
                      </div>
                    </div>
                  </div>

                  {/* Impostos mensais */}
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground mb-3">Impostos - {competencia}</h3>
                    {isSimples ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelCls}>Alíquota</label>
                          <input value={form.aliquota || ""} onChange={e => updateForm(emp.id, "aliquota", e.target.value)} className={inputCls} placeholder="Ex: 6%" />
                        </div>
                        <div>
                          <label className={labelCls}>Status da Guia DAS</label>
                          <select value={form.statusGuiaDAS || "nao_gerado"} onChange={e => updateForm(emp.id, "statusGuiaDAS", e.target.value)} className={inputCls}>
                            <option value="nao_gerado">Não Gerado</option>
                            <option value="gerado">Gerado</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Data de Envio</label>
                          <input type="date" value={form.dataEnvioDAS || ""} onChange={e => updateForm(emp.id, "dataEnvioDAS", e.target.value)} className={inputCls} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: "IRPJ", statusKey: "statusIRPJ", dateKey: "dataEnvioIRPJ" },
                          { label: "CSLL", statusKey: "statusCSLL", dateKey: "dataEnvioCSLL" },
                          { label: "PIS", statusKey: "statusPIS", dateKey: "dataEnvioPIS" },
                          { label: "COFINS", statusKey: "statusCOFINS", dateKey: "dataEnvioCOFINS" },
                          { label: "ISS", statusKey: "statusISS", dateKey: "dataEnvioISS" },
                          { label: "ICMS", statusKey: "statusICMS", dateKey: "dataEnvioICMS" },
                        ].map(imp => (
                          <div key={imp.label} className="grid grid-cols-3 gap-3 items-center">
                            <span className="text-sm font-medium text-card-foreground">{imp.label}</span>
                            <select value={(form as any)[imp.statusKey] || "nao_gerado"} onChange={e => updateForm(emp.id, imp.statusKey, e.target.value)} className={inputCls}>
                              <option value="nao_gerado">Não Gerado</option>
                              <option value="gerado">Gerado</option>
                            </select>
                            <input type="date" value={(form as any)[imp.dateKey] || ""} onChange={e => updateForm(emp.id, imp.dateKey, e.target.value)} className={inputCls} />
                          </div>
                        ))}
                      </div>
                    )}
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

export default FiscalPage;
