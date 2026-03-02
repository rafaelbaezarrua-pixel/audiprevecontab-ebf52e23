import React, { useEffect, useState } from "react";
import { db, ref, onValue, push, remove, update } from "@/lib/firebase";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";

interface Parcelamento {
  id: string;
  tipoContribuinte: string; // empresa | pessoa_fisica
  nome: string;
  cpfCnpj: string;
  tipoParcelamento: string;
  dataInicio: string;
  qtdParcelas: number;
  parcelasPagas: number;
  previsaoFim?: string;
  formaEnvio: string;
  dataEnvio: string;
  status: string;
}

const tiposParcelamento = ["Previdenciário", "Simples Nacional", "MEI", "IRPF", "Dívida Ativa", "ICMS", "Outros"];

const calcPrevisao = (dataInicio: string, qtd: number) => {
  if (!dataInicio || !qtd) return "";
  const d = new Date(dataInicio);
  d.setMonth(d.getMonth() + qtd);
  return d.toISOString().slice(0, 10);
};

const ParcelamentosPage: React.FC = () => {
  const [items, setItems] = useState<Parcelamento[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Parcelamento | null>(null);
  const [form, setForm] = useState({
    tipoContribuinte: "empresa", nome: "", cpfCnpj: "", tipoParcelamento: "Simples Nacional",
    dataInicio: "", qtdParcelas: "", parcelasPagas: "0", formaEnvio: "", dataEnvio: "", status: "ativo"
  });

  useEffect(() => {
    const unsub = onValue(ref(db, "parcelamentos"), (snap) => {
      const data = snap.val() || {};
      setItems(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => unsub();
  }, []);

  const filtered = items.filter(p => p.nome?.toLowerCase().includes(search.toLowerCase()) || p.cpfCnpj?.includes(search));

  const openNew = () => {
    setEditing(null);
    setForm({ tipoContribuinte: "empresa", nome: "", cpfCnpj: "", tipoParcelamento: "Simples Nacional", dataInicio: "", qtdParcelas: "", parcelasPagas: "0", formaEnvio: "", dataEnvio: "", status: "ativo" });
    setShowForm(true);
  };
  const openEdit = (p: Parcelamento) => {
    setEditing(p);
    setForm({ tipoContribuinte: p.tipoContribuinte || "empresa", nome: p.nome, cpfCnpj: p.cpfCnpj || "", tipoParcelamento: p.tipoParcelamento, dataInicio: p.dataInicio || "", qtdParcelas: String(p.qtdParcelas || ""), parcelasPagas: String(p.parcelasPagas || 0), formaEnvio: p.formaEnvio || "", dataEnvio: p.dataEnvio || "", status: p.status });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome obrigatório"); return; }
    const qtd = parseInt(form.qtdParcelas) || 0;
    const payload = {
      ...form, qtdParcelas: qtd, parcelasPagas: parseInt(form.parcelasPagas) || 0,
      previsaoFim: calcPrevisao(form.dataInicio, qtd),
    };
    try {
      if (editing) { await update(ref(db, `parcelamentos/${editing.id}`), payload); toast.success("Atualizado!"); }
      else { await push(ref(db, "parcelamentos"), { ...payload, dataCadastro: new Date().toISOString() }); toast.success("Cadastrado!"); }
      setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir parcelamento?")) return;
    await remove(ref(db, `parcelamentos/${id}`));
    toast.success("Excluído!");
  };

  const totalAtivos = items.filter(p => p.status === "ativo").length;

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Parcelamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de parcelamentos (Empresa e Pessoa Física)</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}>
          <Plus size={18} /> Novo Parcelamento
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Ativos</p><p className="text-2xl font-bold text-primary mt-1">{totalAtivos}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Total</p><p className="text-2xl font-bold text-card-foreground mt-1">{items.length}</p></div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
      </div>

      <div className="module-card overflow-x-auto p-0">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Tipo</th><th>Parcelas</th><th>Progresso</th><th>Previsão Fim</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum parcelamento</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td className="font-medium text-card-foreground">{p.nome}</td>
                <td className="text-muted-foreground font-mono text-xs">{p.cpfCnpj || "—"}</td>
                <td><span className="badge-status badge-info">{p.tipoParcelamento}</span></td>
                <td className="text-muted-foreground">{p.parcelasPagas || 0}/{p.qtdParcelas || 0}</td>
                <td>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.qtdParcelas ? ((p.parcelasPagas || 0) / p.qtdParcelas) * 100 : 0}%` }} />
                  </div>
                </td>
                <td className="text-muted-foreground">{p.previsaoFim ? new Date(p.previsaoFim).toLocaleDateString("pt-BR") : "—"}</td>
                <td><span className={`badge-status ${p.status === "ativo" ? "badge-info" : p.status === "quitado" ? "badge-success" : "badge-gray"}`}>{p.status}</span></td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-card-foreground">{editing ? "Editar" : "Novo"} Parcelamento</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Tipo de Contribuinte</label>
                <select value={form.tipoContribuinte} onChange={e => setForm({ ...form, tipoContribuinte: e.target.value })} className={inputCls}>
                  <option value="empresa">Empresa (PJ)</option>
                  <option value="pessoa_fisica">Pessoa Física (PF)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Nome</label>
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">{form.tipoContribuinte === "empresa" ? "CNPJ" : "CPF"}</label>
                  <input value={form.cpfCnpj} onChange={e => setForm({ ...form, cpfCnpj: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Tipo de Parcelamento</label>
                <select value={form.tipoParcelamento} onChange={e => setForm({ ...form, tipoParcelamento: e.target.value })} className={inputCls}>
                  {tiposParcelamento.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Data Início</label>
                  <input type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Qtd Parcelas</label>
                  <input type="number" value={form.qtdParcelas} onChange={e => setForm({ ...form, qtdParcelas: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Pagas</label>
                  <input type="number" value={form.parcelasPagas} onChange={e => setForm({ ...form, parcelasPagas: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Forma de Envio</label>
                  <input value={form.formaEnvio} onChange={e => setForm({ ...form, formaEnvio: e.target.value })} className={inputCls} placeholder="Email, WhatsApp..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Data de Envio</label>
                  <input type="date" value={form.dataEnvio} onChange={e => setForm({ ...form, dataEnvio: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>
                  <option value="ativo">Ativo</option>
                  <option value="quitado">Quitado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-primary-foreground rounded-lg shadow-md" style={{ background: "var(--gradient-primary)" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParcelamentosPage;
