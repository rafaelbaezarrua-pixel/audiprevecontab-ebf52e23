import React, { useEffect, useState } from "react";
import { db, ref, onValue, push, remove, update } from "@/lib/firebase";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";

interface Recalculo {
  id: string;
  empresa: string;
  departamento: string;
  guias: string;
  data: string;
  formaEnvio: string;
  responsavel: string;
  status: string;
}

const RecalculosPage: React.FC = () => {
  const [items, setItems] = useState<Recalculo[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Recalculo | null>(null);
  const [form, setForm] = useState({ empresa: "", departamento: "Fiscal", guias: "", formaEnvio: "", responsavel: "", status: "enviado" });

  useEffect(() => {
    // Load from multiple sources
    const sources = [
      { path: "recalculos_taxas", dept: "Societário" },
      { path: "recalculos_fiscais", dept: "Fiscal" },
      { path: "recalculos_pessoal", dept: "Pessoal" },
    ];
    const unsubs = sources.map(s =>
      onValue(ref(db, s.path), (snap) => {
        const data = snap.val() || {};
        const list = Object.entries(data).map(([id, val]: any) => ({
          id, departamento: s.dept, empresa: val.empresaNome || val.empresa || "—",
          guias: Array.isArray(val.guiasRecalculadas) ? val.guiasRecalculadas.join(", ") : val.guiasRecalculadas || "—",
          data: val.dataRecalculo || val.dataCriacao || "", formaEnvio: val.formaEnvio || "—",
          responsavel: val.responsavel || "—", status: val.status || "enviado",
        }));
        setItems(prev => [...prev.filter(p => p.departamento !== s.dept), ...list]);
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);

  const filtered = items.filter(r => r.empresa?.toLowerCase().includes(search.toLowerCase()) || r.departamento?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar recálculo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {["Societário", "Fiscal", "Pessoal"].map(dept => (
          <div key={dept} className="stat-card flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{dept}</span>
            <span className="badge-status badge-info">{items.filter(r => r.departamento === dept).length}</span>
          </div>
        ))}
      </div>

      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Empresa</th><th>Departamento</th><th>Guias</th><th>Data</th><th>Envio</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum recálculo</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={`${r.departamento}-${r.id}-${i}`}>
                <td className="font-medium text-card-foreground">{r.empresa}</td>
                <td><span className="badge-status badge-info">{r.departamento}</span></td>
                <td className="text-muted-foreground text-xs max-w-[200px] truncate">{r.guias}</td>
                <td className="text-muted-foreground">{r.data ? new Date(r.data).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="text-muted-foreground">{r.formaEnvio}</td>
                <td><span className={`badge-status ${r.status === "enviado" ? "badge-success" : "badge-warning"}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecalculosPage;
