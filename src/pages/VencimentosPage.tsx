import React, { useEffect, useState } from "react";
import { db, ref, onValue } from "@/lib/firebase";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface Vencimento {
  empresaId: string;
  empresa: string;
  tipo: string;
  data: string;
  diasRestantes: number;
  status: string;
}

const calcDias = (data: string) => Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
const calcStatus = (dias: number) => dias < 0 ? "vencido" : dias <= 30 ? "próximo" : "em dia";

const VencimentosPage: React.FC = () => {
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    const unsub = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      const list: Vencimento[] = [];
      Object.entries(data).forEach(([id, emp]: any) => {
        if (emp.vencimentos) {
          Object.entries(emp.vencimentos).forEach(([tipo, dt]: any) => {
            const dias = calcDias(dt);
            list.push({ empresaId: id, empresa: emp.nomeEmpresa, tipo, data: dt, diasRestantes: dias, status: calcStatus(dias) });
          });
        }
      });
      list.sort((a, b) => a.diasRestantes - b.diasRestantes);
      setVencimentos(list);
    });
    return () => unsub();
  }, []);

  const filtered = filter === "todos" ? vencimentos : vencimentos.filter(v => v.status === filter);
  const counts = { vencido: vencimentos.filter(v => v.status === "vencido").length, proximo: vencimentos.filter(v => v.status === "próximo").length, emDia: vencimentos.filter(v => v.status === "em dia").length };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card flex items-center justify-between cursor-pointer" onClick={() => setFilter("vencido")}>
          <div><p className="text-sm text-muted-foreground">Vencidos</p><p className="text-xl font-bold text-destructive">{counts.vencido}</p></div>
          <AlertTriangle className="text-destructive" size={22} />
        </div>
        <div className="stat-card flex items-center justify-between cursor-pointer" onClick={() => setFilter("próximo")}>
          <div><p className="text-sm text-muted-foreground">Próximos</p><p className="text-xl font-bold text-warning">{counts.proximo}</p></div>
          <Clock className="text-warning" size={22} />
        </div>
        <div className="stat-card flex items-center justify-between cursor-pointer" onClick={() => setFilter("em dia")}>
          <div><p className="text-sm text-muted-foreground">Em Dia</p><p className="text-xl font-bold text-success">{counts.emDia}</p></div>
          <CheckCircle className="text-success" size={22} />
        </div>
      </div>

      <div className="flex gap-2">
        {["todos", "vencido", "próximo", "em dia"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Empresa</th><th>Tipo</th><th>Vencimento</th><th>Dias</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum vencimento</td></tr>
            ) : filtered.map((v, i) => (
              <tr key={i}>
                <td className="font-medium text-card-foreground">{v.empresa}</td>
                <td className="text-muted-foreground">{v.tipo}</td>
                <td className="text-muted-foreground">{new Date(v.data).toLocaleDateString("pt-BR")}</td>
                <td className="text-card-foreground font-medium">{v.diasRestantes}d</td>
                <td><span className={`badge-status ${v.status === "vencido" ? "badge-danger" : v.status === "próximo" ? "badge-warning" : "badge-success"}`}>{v.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VencimentosPage;
