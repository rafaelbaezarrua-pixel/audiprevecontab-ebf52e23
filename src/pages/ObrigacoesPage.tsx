import React, { useEffect, useState } from "react";
import { db, ref, onValue, push, remove, update } from "@/lib/firebase";
import { Plus, Edit2, Trash2, X, Search, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";

interface Obrigacao {
  id: string;
  empresa: string;
  obrigacao: string;
  competencia: string;
  dataVencimento: string;
  status: string;
  responsavel?: string;
}

const obrigacoesLista = ["DCTF", "ECD", "ECF", "DIRF", "RAIS", "SPED Fiscal", "SPED Contribuições", "DEFIS", "DASN-SIMEI", "GFIP", "eSocial", "EFD-Reinf", "Outro"];

const ObrigacoesPage: React.FC = () => {
  const [items, setItems] = useState<Obrigacao[]>([]);
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Obrigacao | null>(null);
  const [form, setForm] = useState({ empresa: "", obrigacao: "DCTF", competencia: "", dataVencimento: "", status: "pendente", responsavel: "" });

  useEffect(() => {
    const unsub = onValue(ref(db, "obrigacoes"), (snap) => {
      const data = snap.val() || {};
      setItems(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => unsub();
  }, []);

  const filtered = items.filter(o =>
    (o.empresa?.toLowerCase().includes(search.toLowerCase()) || o.obrigacao?.toLowerCase().includes(search.toLowerCase())) &&
    (!competencia || o.competencia === competencia)
  );

  const openNew = () => { setEditing(null); setForm({ empresa: "", obrigacao: "DCTF", competencia, dataVencimento: "", status: "pendente", responsavel: "" }); setShowForm(true); };
  const openEdit = (o: Obrigacao) => { setEditing(o); setForm({ empresa: o.empresa, obrigacao: o.obrigacao, competencia: o.competencia, dataVencimento: o.dataVencimento || "", status: o.status, responsavel: o.responsavel || "" }); setShowForm(true); };

  const toggleStatus = async (o: Obrigacao) => {
    const newStatus = o.status === "concluída" ? "pendente" : "concluída";
    await update(ref(db, `obrigacoes/${o.id}`), { status: newStatus });
    toast.success(newStatus === "concluída" ? "Marcada como concluída!" : "Marcada como pendente!");
  };

  const handleSave = async () => {
    if (!form.empresa.trim()) { toast.error("Empresa obrigatória"); return; }
    try {
      if (editing) { await update(ref(db, `obrigacoes/${editing.id}`), form); toast.success("Atualizada!"); }
      else { await push(ref(db, "obrigacoes"), form); toast.success("Cadastrada!"); }
      setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir?")) return;
    await remove(ref(db, `obrigacoes/${id}`));
    toast.success("Excluída!");
  };

  const totalPendente = filtered.filter(o => o.status !== "concluída").length;
  const totalConcluida = filtered.filter(o => o.status === "concluída").length;

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
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Plus size={16} /> Nova Obrigação</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card"><p className="text-sm text-muted-foreground">Pendentes</p><p className="text-xl font-bold text-warning mt-1">{totalPendente}</p></div>
        <div className="stat-card"><p className="text-sm text-muted-foreground">Concluídas</p><p className="text-xl font-bold text-success mt-1">{totalConcluida}</p></div>
      </div>

      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th className="w-10"></th><th>Empresa</th><th>Obrigação</th><th>Vencimento</th><th>Responsável</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma obrigação</td></tr>
            ) : filtered.map(o => (
              <tr key={o.id}>
                <td><button onClick={() => toggleStatus(o)} className="text-muted-foreground hover:text-success">{o.status === "concluída" ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} />}</button></td>
                <td className="font-medium text-card-foreground">{o.empresa}</td>
                <td><span className="badge-status badge-info">{o.obrigacao}</span></td>
                <td className="text-muted-foreground">{o.dataVencimento ? new Date(o.dataVencimento).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="text-muted-foreground">{o.responsavel || "—"}</td>
                <td><span className={`badge-status ${o.status === "concluída" ? "badge-success" : "badge-warning"}`}>{o.status === "concluída" ? "Concluída" : "Pendente"}</span></td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(o)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(o.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button>
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
            <div className="flex items-center justify-between p-5 border-b border-border"><h3 className="text-lg font-bold text-card-foreground">{editing ? "Editar" : "Nova"} Obrigação</h3><button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Empresa</label><input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Obrigação</label><select value={form.obrigacao} onChange={e => setForm({ ...form, obrigacao: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">{obrigacoesLista.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Competência</label><input type="month" value={form.competencia} onChange={e => setForm({ ...form, competencia: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Vencimento</label><input type="date" value={form.dataVencimento} onChange={e => setForm({ ...form, dataVencimento: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Responsável</label><input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"><option value="pendente">Pendente</option><option value="concluída">Concluída</option></select></div>
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

export default ObrigacoesPage;
