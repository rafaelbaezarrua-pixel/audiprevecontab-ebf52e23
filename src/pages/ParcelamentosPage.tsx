import React, { useEffect, useState } from "react";
import { db, ref, onValue, push, remove, update } from "@/lib/firebase";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";

interface Parcelamento {
  id: string;
  empresa: string;
  tributo: string;
  valorTotal: number;
  parcelas: number;
  parcelasPagas: number;
  valorParcela: number;
  status: string;
  dataCadastro?: string;
}

const ParcelamentosPage: React.FC = () => {
  const [items, setItems] = useState<Parcelamento[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Parcelamento | null>(null);
  const [form, setForm] = useState({ empresa: "", tributo: "", valorTotal: "", parcelas: "", parcelasPagas: "", valorParcela: "", status: "ativo" });

  useEffect(() => {
    const unsub = onValue(ref(db, "parcelamentos"), (snap) => {
      const data = snap.val() || {};
      setItems(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => unsub();
  }, []);

  const filtered = items.filter(p => p.empresa?.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setEditing(null); setForm({ empresa: "", tributo: "", valorTotal: "", parcelas: "", parcelasPagas: "0", valorParcela: "", status: "ativo" }); setShowForm(true); };
  const openEdit = (p: Parcelamento) => { setEditing(p); setForm({ empresa: p.empresa, tributo: p.tributo, valorTotal: String(p.valorTotal || ""), parcelas: String(p.parcelas || ""), parcelasPagas: String(p.parcelasPagas || 0), valorParcela: String(p.valorParcela || ""), status: p.status }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.empresa.trim()) { toast.error("Empresa obrigatória"); return; }
    const payload = { ...form, valorTotal: parseFloat(form.valorTotal) || 0, parcelas: parseInt(form.parcelas) || 0, parcelasPagas: parseInt(form.parcelasPagas) || 0, valorParcela: parseFloat(form.valorParcela) || 0 };
    try {
      if (editing) { await update(ref(db, `parcelamentos/${editing.id}`), payload); toast.success("Atualizado!"); }
      else { await push(ref(db, "parcelamentos"), { ...payload, dataCadastro: new Date().toISOString() }); toast.success("Cadastrado!"); }
      setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir?")) return;
    await remove(ref(db, `parcelamentos/${id}`));
    toast.success("Excluído!");
  };

  const totalAtivos = items.filter(p => p.status === "ativo").length;
  const saldoTotal = items.filter(p => p.status === "ativo").reduce((a, p) => a + ((p.parcelas - p.parcelasPagas) * p.valorParcela), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Plus size={16} /> Novo Parcelamento</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card"><p className="text-sm text-muted-foreground">Parcelamentos Ativos</p><p className="text-xl font-bold text-primary mt-1">{totalAtivos}</p></div>
        <div className="stat-card"><p className="text-sm text-muted-foreground">Saldo Restante</p><p className="text-xl font-bold text-warning mt-1">R$ {saldoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
      </div>

      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Empresa</th><th>Tributo</th><th>Valor Total</th><th>Parcelas</th><th>Progresso</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum parcelamento</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td className="font-medium text-card-foreground">{p.empresa}</td>
                <td className="text-muted-foreground">{p.tributo || "—"}</td>
                <td className="text-card-foreground">R$ {(p.valorTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="text-muted-foreground">{p.parcelasPagas || 0}/{p.parcelas || 0}</td>
                <td>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.parcelas ? (p.parcelasPagas / p.parcelas) * 100 : 0}%` }} />
                  </div>
                </td>
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
            <div className="flex items-center justify-between p-5 border-b border-border"><h3 className="text-lg font-bold text-card-foreground">{editing ? "Editar" : "Novo"} Parcelamento</h3><button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Empresa</label><input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Tributo</label><input value={form.tributo} onChange={e => setForm({ ...form, tributo: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Valor Total</label><input type="number" step="0.01" value={form.valorTotal} onChange={e => setForm({ ...form, valorTotal: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Parcelas</label><input type="number" value={form.parcelas} onChange={e => setForm({ ...form, parcelas: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Pagas</label><input type="number" value={form.parcelasPagas} onChange={e => setForm({ ...form, parcelasPagas: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Valor Parcela</label><input type="number" step="0.01" value={form.valorParcela} onChange={e => setForm({ ...form, valorParcela: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"><option value="ativo">Ativo</option><option value="quitado">Quitado</option><option value="cancelado">Cancelado</option></select></div>
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
