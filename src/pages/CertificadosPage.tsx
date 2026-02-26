import React, { useEffect, useState } from "react";
import { db, ref, onValue, push, remove, update } from "@/lib/firebase";
import { Plus, Edit2, Trash2, X, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Certificado {
  id: string;
  empresa: string;
  tipo: string;
  dataValidade: string;
  responsavel?: string;
  status?: string;
  dataCadastro?: string;
}

const tipos: Record<string, string> = { a1: "A1 (Arquivo)", a3: "A3 (Token)", "e-cpf": "e-CPF", "e-cnpj": "e-CNPJ", nfe: "NF-e" };

const calcDias = (data: string) => {
  if (!data) return 999;
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
};

const CertificadosPage: React.FC = () => {
  const [items, setItems] = useState<Certificado[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Certificado | null>(null);
  const [form, setForm] = useState({ empresa: "", tipo: "a1", dataValidade: "", responsavel: "" });

  useEffect(() => {
    const unsub = onValue(ref(db, "certificados"), (snap) => {
      const data = snap.val() || {};
      setItems(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => unsub();
  }, []);

  const filtered = items.filter(c => c.empresa?.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setEditing(null); setForm({ empresa: "", tipo: "a1", dataValidade: "", responsavel: "" }); setShowForm(true); };
  const openEdit = (c: Certificado) => { setEditing(c); setForm({ empresa: c.empresa, tipo: c.tipo, dataValidade: c.dataValidade, responsavel: c.responsavel || "" }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.empresa.trim()) { toast.error("Empresa é obrigatório"); return; }
    try {
      if (editing) {
        await update(ref(db, `certificados/${editing.id}`), form);
        toast.success("Certificado atualizado!");
      } else {
        await push(ref(db, "certificados"), { ...form, dataCadastro: new Date().toISOString() });
        toast.success("Certificado cadastrado!");
      }
      setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir certificado?")) return;
    await remove(ref(db, `certificados/${id}`));
    toast.success("Excluído!");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar certificado..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}>
          <Plus size={16} /> Novo Certificado
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ativos", count: items.filter(c => calcDias(c.dataValidade) > 30).length, cls: "badge-success" },
          { label: "Próximos", count: items.filter(c => { const d = calcDias(c.dataValidade); return d >= 0 && d <= 30; }).length, cls: "badge-warning" },
          { label: "Vencidos", count: items.filter(c => calcDias(c.dataValidade) < 0).length, cls: "badge-danger" },
        ].map(s => (
          <div key={s.label} className="stat-card flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <span className={`badge-status ${s.cls}`}>{s.count}</span>
          </div>
        ))}
      </div>

      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Empresa</th><th>Tipo</th><th>Validade</th><th>Dias</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum certificado encontrado</td></tr>
            ) : filtered.map(c => {
              const dias = calcDias(c.dataValidade);
              const st = dias < 0 ? "Vencido" : dias <= 30 ? "Próximo" : "Ativo";
              const cls = dias < 0 ? "badge-danger" : dias <= 30 ? "badge-warning" : "badge-success";
              return (
                <tr key={c.id}>
                  <td className="font-medium text-card-foreground">{c.empresa}</td>
                  <td className="text-muted-foreground">{tipos[c.tipo] || c.tipo}</td>
                  <td className="text-muted-foreground">{c.dataValidade ? new Date(c.dataValidade).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="text-muted-foreground">{dias === 999 ? "—" : `${dias}d`}</td>
                  <td><span className={`badge-status ${cls}`}>{st}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-card-foreground">{editing ? "Editar" : "Novo"} Certificado</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Empresa</label><input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"><option value="a1">A1 (Arquivo)</option><option value="a3">A3 (Token)</option><option value="e-cpf">e-CPF</option><option value="e-cnpj">e-CNPJ</option><option value="nfe">NF-e</option></select></div>
                <div><label className="block text-sm font-medium text-card-foreground mb-1">Data de Validade</label><input type="date" value={form.dataValidade} onChange={e => setForm({ ...form, dataValidade: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Responsável</label><input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-primary-foreground rounded-lg shadow-md" style={{ background: "var(--gradient-primary)" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificadosPage;
