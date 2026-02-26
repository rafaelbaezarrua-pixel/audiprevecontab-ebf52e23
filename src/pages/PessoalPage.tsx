import React, { useEffect, useState } from "react";
import { db, ref, onValue, push, remove, update } from "@/lib/firebase";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";

interface EmpresaPessoal {
  id: string;
  nomeEmpresa: string;
  cnpj?: string;
  funcionarios?: number;
  proLabore?: number;
  vt?: number;
  va?: number;
  inss?: string;
  fgts?: string;
  dctfWeb?: string;
}

const PessoalPage: React.FC = () => {
  const [items, setItems] = useState<EmpresaPessoal[]>([]);
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmpresaPessoal | null>(null);
  const [form, setForm] = useState({ nomeEmpresa: "", cnpj: "", funcionarios: "", proLabore: "", vt: "", va: "" });

  useEffect(() => {
    const unsub = onValue(ref(db, `pessoal/${competencia}`), (snap) => {
      const data = snap.val() || {};
      setItems(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => unsub();
  }, [competencia]);

  const filtered = items.filter(e => e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setEditing(null); setForm({ nomeEmpresa: "", cnpj: "", funcionarios: "", proLabore: "", vt: "", va: "" }); setShowForm(true); };
  const openEdit = (e: EmpresaPessoal) => { setEditing(e); setForm({ nomeEmpresa: e.nomeEmpresa, cnpj: e.cnpj || "", funcionarios: String(e.funcionarios || ""), proLabore: String(e.proLabore || ""), vt: String(e.vt || ""), va: String(e.va || "") }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nomeEmpresa.trim()) { toast.error("Nome obrigatório"); return; }
    const payload = { ...form, funcionarios: parseInt(form.funcionarios) || 0, proLabore: parseFloat(form.proLabore) || 0, vt: parseFloat(form.vt) || 0, va: parseFloat(form.va) || 0 };
    try {
      if (editing) { await update(ref(db, `pessoal/${competencia}/${editing.id}`), payload); toast.success("Atualizado!"); }
      else { await push(ref(db, `pessoal/${competencia}`), payload); toast.success("Cadastrado!"); }
      setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir?")) return;
    await remove(ref(db, `pessoal/${competencia}/${id}`));
    toast.success("Excluído!");
  };

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
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Plus size={16} /> Nova Empresa</button>
      </div>

      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Empresa</th><th>CNPJ</th><th>Funcionários</th><th>Pró-labore</th><th>VT</th><th>VA</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id}>
                <td className="font-medium text-card-foreground">{e.nomeEmpresa}</td>
                <td className="text-muted-foreground">{e.cnpj || "—"}</td>
                <td className="text-card-foreground">{e.funcionarios || 0}</td>
                <td className="text-card-foreground">R$ {(e.proLabore || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="text-card-foreground">R$ {(e.vt || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="text-card-foreground">R$ {(e.va || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(e)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(e.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button>
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
            <div className="flex items-center justify-between p-5 border-b border-border"><h3 className="text-lg font-bold text-card-foreground">{editing ? "Editar" : "Nova"} Empresa</h3><button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Nome da Empresa</label><input value={form.nomeEmpresa} onChange={e => setForm({ ...form, nomeEmpresa: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">CNPJ</label><input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Funcionários</label><input type="number" value={form.funcionarios} onChange={e => setForm({ ...form, funcionarios: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Pró-labore</label><input type="number" step="0.01" value={form.proLabore} onChange={e => setForm({ ...form, proLabore: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-card-foreground mb-1">VT</label><input type="number" step="0.01" value={form.vt} onChange={e => setForm({ ...form, vt: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">VA</label><input type="number" step="0.01" value={form.va} onChange={e => setForm({ ...form, va: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
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

export default PessoalPage;
