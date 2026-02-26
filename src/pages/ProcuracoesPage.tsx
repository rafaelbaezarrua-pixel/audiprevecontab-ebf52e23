import React, { useEffect, useState } from "react";
import { db, ref, onValue, push, remove, update } from "@/lib/firebase";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";

interface Procuracao {
  id: string;
  empresa: string;
  procurador: string;
  dataProcuracao: string;
  dataValidade?: string;
  tipo?: string;
  dataCadastro?: string;
}

const ProcuracoesPage: React.FC = () => {
  const [items, setItems] = useState<Procuracao[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Procuracao | null>(null);
  const [form, setForm] = useState({ empresa: "", procurador: "", dataProcuracao: "", dataValidade: "", tipo: "ecac" });

  useEffect(() => {
    const unsub = onValue(ref(db, "procuracoes"), (snap) => {
      const data = snap.val() || {};
      setItems(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => unsub();
  }, []);

  const filtered = items.filter(p => p.empresa?.toLowerCase().includes(search.toLowerCase()) || p.procurador?.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setEditing(null); setForm({ empresa: "", procurador: "", dataProcuracao: "", dataValidade: "", tipo: "ecac" }); setShowForm(true); };
  const openEdit = (p: Procuracao) => { setEditing(p); setForm({ empresa: p.empresa, procurador: p.procurador, dataProcuracao: p.dataProcuracao || "", dataValidade: p.dataValidade || "", tipo: p.tipo || "ecac" }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.empresa.trim()) { toast.error("Empresa obrigatória"); return; }
    try {
      if (editing) { await update(ref(db, `procuracoes/${editing.id}`), form); toast.success("Atualizada!"); }
      else { await push(ref(db, "procuracoes"), { ...form, dataCadastro: new Date().toISOString() }); toast.success("Cadastrada!"); }
      setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir procuração?")) return;
    await remove(ref(db, `procuracoes/${id}`));
    toast.success("Excluída!");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar procuração..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Plus size={16} /> Nova Procuração</button>
      </div>

      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Empresa</th><th>Procurador</th><th>Tipo</th><th>Data</th><th>Validade</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma procuração encontrada</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td className="font-medium text-card-foreground">{p.empresa}</td>
                <td className="text-muted-foreground">{p.procurador || "—"}</td>
                <td><span className="badge-status badge-info">{p.tipo || "e-CAC"}</span></td>
                <td className="text-muted-foreground">{p.dataProcuracao ? new Date(p.dataProcuracao).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="text-muted-foreground">{p.dataValidade ? new Date(p.dataValidade).toLocaleDateString("pt-BR") : "—"}</td>
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
              <h3 className="text-lg font-bold text-card-foreground">{editing ? "Editar" : "Nova"} Procuração</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Empresa</label><input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Procurador</label><input value={form.procurador} onChange={e => setForm({ ...form, procurador: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Data da Procuração</label><input type="date" value={form.dataProcuracao} onChange={e => setForm({ ...form, dataProcuracao: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Validade</label><input type="date" value={form.dataValidade} onChange={e => setForm({ ...form, dataValidade: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="ecac">e-CAC</option><option value="prefeitura">Prefeitura</option><option value="estado">Estado</option><option value="judicial">Judicial</option><option value="outro">Outro</option>
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

export default ProcuracoesPage;
