import React, { useEffect, useState } from "react";
import { db, ref, onValue, push, remove, update } from "@/lib/firebase";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";

interface Honorario {
  id: string;
  empresa: string;
  valor: number;
  competencia: string;
  status: string;
  dataPagamento?: string;
  observacao?: string;
}

const HonorariosPage: React.FC = () => {
  const [items, setItems] = useState<Honorario[]>([]);
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Honorario | null>(null);
  const [form, setForm] = useState({ empresa: "", valor: "", competencia: "", status: "pendente", observacao: "" });

  useEffect(() => {
    const unsub = onValue(ref(db, "honorarios"), (snap) => {
      const data = snap.val() || {};
      setItems(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => unsub();
  }, []);

  const filtered = items.filter(h =>
    (h.empresa?.toLowerCase().includes(search.toLowerCase())) &&
    (!competencia || h.competencia === competencia)
  );

  const openNew = () => { setEditing(null); setForm({ empresa: "", valor: "", competencia, status: "pendente", observacao: "" }); setShowForm(true); };
  const openEdit = (h: Honorario) => { setEditing(h); setForm({ empresa: h.empresa, valor: String(h.valor || ""), competencia: h.competencia, status: h.status, observacao: h.observacao || "" }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.empresa.trim()) { toast.error("Empresa obrigatória"); return; }
    const payload = { ...form, valor: parseFloat(form.valor) || 0 };
    try {
      if (editing) { await update(ref(db, `honorarios/${editing.id}`), payload); toast.success("Atualizado!"); }
      else { await push(ref(db, "honorarios"), payload); toast.success("Cadastrado!"); }
      setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir?")) return;
    await remove(ref(db, `honorarios/${id}`));
    toast.success("Excluído!");
  };

  const totalPendente = filtered.filter(h => h.status === "pendente").reduce((a, b) => a + (b.valor || 0), 0);
  const totalPago = filtered.filter(h => h.status === "pago").reduce((a, b) => a + (b.valor || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Plus size={16} /> Novo Honorário</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card"><p className="text-sm text-muted-foreground">Pendente</p><p className="text-xl font-bold text-warning mt-1">R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
        <div className="stat-card"><p className="text-sm text-muted-foreground">Recebido</p><p className="text-xl font-bold text-success mt-1">R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
      </div>

      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Empresa</th><th>Valor</th><th>Competência</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum honorário</td></tr>
            ) : filtered.map(h => (
              <tr key={h.id}>
                <td className="font-medium text-card-foreground">{h.empresa}</td>
                <td className="text-card-foreground font-medium">R$ {(h.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="text-muted-foreground">{h.competencia}</td>
                <td><span className={`badge-status ${h.status === "pago" ? "badge-success" : "badge-warning"}`}>{h.status === "pago" ? "Pago" : "Pendente"}</span></td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(h)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(h.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button>
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
            <div className="flex items-center justify-between p-5 border-b border-border"><h3 className="text-lg font-bold text-card-foreground">{editing ? "Editar" : "Novo"} Honorário</h3><button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Empresa</label><input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Valor</label><input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Competência</label><input type="month" value={form.competencia} onChange={e => setForm({ ...form, competencia: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Observação</label><textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" rows={2} /></div>
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

export default HonorariosPage;
