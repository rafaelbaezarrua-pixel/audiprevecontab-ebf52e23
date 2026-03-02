import React, { useEffect, useState } from "react";
import { db, ref, onValue, update, push, remove } from "@/lib/firebase";
import { Search, Plus, Trash2, ChevronDown, ChevronUp, Save, Building2, FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
}

interface Certidao {
  id?: string;
  tipo: string;
  dataEmissao?: string;
  dataValidade?: string;
  observacao?: string;
}

const tiposCertidao = [
  "CND Federal", "CND Estadual", "CND Municipal", "CND FGTS", "CND Trabalhista",
  "CNDT", "Certidão INSS", "Certidão Tributos Federais", "Outra"
];

const calcDias = (data?: string) => {
  if (!data) return 999;
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
};

const CertidoesPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [certidoesData, setCertidoesData] = useState<Record<string, Record<string, Certidao>>>({});
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newCertidao, setNewCertidao] = useState<Certidao>({ tipo: "CND Federal", dataEmissao: "", dataValidade: "", observacao: "" });

  useEffect(() => {
    const unsub1 = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      setEmpresas(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    const unsub2 = onValue(ref(db, "certidoes_negativas"), (snap) => {
      setCertidoesData(snap.val() || {});
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const filtered = empresas.filter(e => e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search));

  const addCertidao = async (empresaId: string) => {
    if (!newCertidao.tipo) { toast.error("Selecione o tipo"); return; }
    try {
      const newRef = push(ref(db, `certidoes_negativas/${empresaId}`));
      await update(newRef, { ...newCertidao, dataCadastro: new Date().toISOString() });
      toast.success("Certidão adicionada!");
      setNewCertidao({ tipo: "CND Federal", dataEmissao: "", dataValidade: "", observacao: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  const removeCertidao = async (empresaId: string, certId: string) => {
    if (!window.confirm("Excluir certidão?")) return;
    await remove(ref(db, `certidoes_negativas/${empresaId}/${certId}`));
    toast.success("Certidão excluída!");
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-card-foreground">Certidões Negativas</h1>
        <p className="text-sm text-muted-foreground mt-1">Controle de certidões por empresa com vencimento</p>
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
          const certidoes = certidoesData[emp.id] || {};
          const certList = Object.entries(certidoes).map(([id, val]) => ({ id, ...val }));
          const vencidas = certList.filter(c => calcDias(c.dataValidade) < 0).length;

          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(isOpen ? null : emp.id)}>
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
                  <span className="text-xs text-muted-foreground">{certList.length} certidões</span>
                  {vencidas > 0 && <span className="badge-status badge-danger">{vencidas} vencidas</span>}
                  {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-5 space-y-4 bg-muted/10">
                  {/* Existing certidões */}
                  {certList.length > 0 && (
                    <div className="space-y-2">
                      {certList.map(c => {
                        const dias = calcDias(c.dataValidade);
                        const statusCls = dias < 0 ? "badge-danger" : dias <= 30 ? "badge-warning" : "badge-success";
                        const statusLabel = dias === 999 ? "—" : dias < 0 ? "Vencida" : dias <= 30 ? "Próxima" : "Válida";

                        return (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-3">
                              <FileText size={16} className="text-primary" />
                              <div>
                                <p className="text-sm font-medium text-card-foreground">{c.tipo}</p>
                                <p className="text-xs text-muted-foreground">
                                  {c.dataValidade ? `Venc: ${new Date(c.dataValidade).toLocaleDateString("pt-BR")}` : "Sem vencimento"}
                                  {dias !== 999 && ` (${dias}d)`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`badge-status ${statusCls}`}>{statusLabel}</span>
                              <button onClick={() => removeCertidao(emp.id, c.id!)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add new certidão */}
                  <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                    <p className="text-sm font-medium text-card-foreground">Adicionar Certidão</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className={labelCls}>Tipo</label>
                        <select value={newCertidao.tipo} onChange={e => setNewCertidao({ ...newCertidao, tipo: e.target.value })} className={inputCls}>
                          {tiposCertidao.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Data de Emissão</label>
                        <input type="date" value={newCertidao.dataEmissao || ""} onChange={e => setNewCertidao({ ...newCertidao, dataEmissao: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Data de Validade</label>
                        <input type="date" value={newCertidao.dataValidade || ""} onChange={e => setNewCertidao({ ...newCertidao, dataValidade: e.target.value })} className={inputCls} />
                      </div>
                      <div className="flex items-end">
                        <button onClick={() => addCertidao(emp.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}>
                          <Plus size={14} /> Adicionar
                        </button>
                      </div>
                    </div>
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

export default CertidoesPage;
