import React, { useEffect, useState } from "react";
import { db, ref, onValue, push, set, remove, update } from "@/lib/firebase";
import { Plus, Search, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
  regimeTributario: string;
  status: string;
  socios?: any[];
  dataCadastro?: string;
}

const regimes: Record<string, string> = {
  simples: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
};

const SocietarioPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [form, setForm] = useState({ nomeEmpresa: "", cnpj: "", regimeTributario: "simples", status: "ativa" });

  useEffect(() => {
    const unsub = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      setEmpresas(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => unsub();
  }, []);

  const filtered = empresas.filter(e =>
    e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj?.includes(search)
  );

  const openNew = () => {
    setEditing(null);
    setForm({ nomeEmpresa: "", cnpj: "", regimeTributario: "simples", status: "ativa" });
    setShowForm(true);
  };

  const openEdit = (emp: Empresa) => {
    setEditing(emp);
    setForm({ nomeEmpresa: emp.nomeEmpresa, cnpj: emp.cnpj, regimeTributario: emp.regimeTributario || "simples", status: emp.status || "ativa" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nomeEmpresa.trim()) { toast.error("Nome da empresa é obrigatório"); return; }
    try {
      if (editing) {
        await update(ref(db, `empresas/${editing.id}`), form);
        toast.success("Empresa atualizada!");
      } else {
        await push(ref(db, "empresas"), { ...form, dataCadastro: new Date().toISOString() });
        toast.success("Empresa cadastrada!");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir esta empresa?")) return;
    try {
      await remove(ref(db, `empresas/${id}`));
      toast.success("Empresa excluída!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md hover:shadow-lg transition-all" style={{ background: "var(--gradient-primary)" }}>
          <Plus size={16} /> Nova Empresa
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ativas", count: empresas.filter(e => !e.status || e.status === "ativa").length, cls: "badge-success" },
          { label: "Inativas", count: empresas.filter(e => e.status === "inativa").length, cls: "badge-warning" },
          { label: "Paralisadas", count: empresas.filter(e => e.status === "paralisada").length, cls: "badge-danger" },
        ].map(s => (
          <div key={s.label} className="stat-card flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <span className={`badge-status ${s.cls}`}>{s.count}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Empresa</th><th>CNPJ</th><th>Regime</th><th>Status</th><th className="text-right">Ações</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma empresa encontrada</td></tr>
            ) : filtered.map(emp => (
              <tr key={emp.id}>
                <td className="font-medium text-card-foreground">{emp.nomeEmpresa}</td>
                <td className="text-muted-foreground">{emp.cnpj || "—"}</td>
                <td className="text-muted-foreground">{regimes[emp.regimeTributario] || emp.regimeTributario || "—"}</td>
                <td>
                  <span className={`badge-status ${emp.status === "inativa" ? "badge-warning" : emp.status === "paralisada" ? "badge-danger" : "badge-success"}`}>
                    {emp.status || "Ativa"}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(emp)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(emp.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-card-foreground">{editing ? "Editar Empresa" : "Nova Empresa"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Nome da Empresa</label>
                <input value={form.nomeEmpresa} onChange={e => setForm({ ...form, nomeEmpresa: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">CNPJ</label>
                <input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="00.000.000/0000-00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Regime Tributário</label>
                  <select value={form.regimeTributario} onChange={e => setForm({ ...form, regimeTributario: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                    <option value="simples">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                    <option value="mei">MEI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                    <option value="paralisada">Paralisada</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-primary-foreground rounded-lg shadow-md hover:shadow-lg transition-all" style={{ background: "var(--gradient-primary)" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocietarioPage;
