import React, { useEffect, useState } from "react";
import { db, ref, onValue } from "@/lib/firebase";
import { Clock, AlertTriangle, CheckCircle, Search } from "lucide-react";

interface Vencimento {
  empresa: string;
  tipo: string;
  data: string;
  diasRestantes: number;
  status: string;
}

const calcDias = (data?: string) => {
  if (!data) return 999;
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
};
const calcStatus = (dias: number) => dias < 0 ? "vencido" : dias <= 30 ? "próximo" : "em dia";

const licencaLabels: Record<string, string> = {
  alvara: "Alvará", vigilanciaSanitaria: "Vigilância Sanitária", corpoBombeiros: "Corpo de Bombeiros", meioAmbiente: "Meio Ambiente"
};

const VencimentosPage: React.FC = () => {
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Aggregate vencimentos from empresas (licenças), certificados_digitais, procuracoes_empresas
    const unsubs: (() => void)[] = [];

    const list: Vencimento[] = [];
    const rebuild = () => setVencimentos([...list].sort((a, b) => a.diasRestantes - b.diasRestantes));

    // Licenças das empresas
    unsubs.push(onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      // Remove old empresa entries
      const filtered = list.filter(v => !v.tipo.startsWith("Licença"));
      list.length = 0;
      list.push(...filtered);

      Object.entries(data).forEach(([, emp]: any) => {
        if (emp.licencas) {
          Object.entries(emp.licencas).forEach(([key, lic]: any) => {
            if (lic.tipo === "com_vencimento" && lic.vencimento) {
              const dias = calcDias(lic.vencimento);
              list.push({ empresa: emp.nomeEmpresa, tipo: `Licença: ${licencaLabels[key] || key}`, data: lic.vencimento, diasRestantes: dias, status: calcStatus(dias) });
            }
          });
        }
      });
      rebuild();
    }));

    // Certificados digitais
    unsubs.push(onValue(ref(db, "certificados_digitais"), (snap) => {
      const data = snap.val() || {};
      const filtered = list.filter(v => v.tipo !== "Certificado Digital");
      list.length = 0;
      list.push(...filtered);

      // Need empresa names
      onValue(ref(db, "empresas"), (empSnap) => {
        const empresas = empSnap.val() || {};
        Object.entries(data).forEach(([empId, cert]: any) => {
          if (cert.dataValidade) {
            const dias = calcDias(cert.dataValidade);
            const empName = empresas[empId]?.nomeEmpresa || "—";
            list.push({ empresa: empName, tipo: "Certificado Digital", data: cert.dataValidade, diasRestantes: dias, status: calcStatus(dias) });
          }
        });
        rebuild();
      }, { onlyOnce: true });
    }));

    // Procurações
    unsubs.push(onValue(ref(db, "procuracoes_empresas"), (snap) => {
      const data = snap.val() || {};
      const filtered = list.filter(v => v.tipo !== "Procuração");
      list.length = 0;
      list.push(...filtered);

      onValue(ref(db, "empresas"), (empSnap) => {
        const empresas = empSnap.val() || {};
        Object.entries(data).forEach(([empId, proc]: any) => {
          if (proc.dataValidade) {
            const dias = calcDias(proc.dataValidade);
            const empName = empresas[empId]?.nomeEmpresa || "—";
            list.push({ empresa: empName, tipo: "Procuração", data: proc.dataValidade, diasRestantes: dias, status: calcStatus(dias) });
          }
        });
        rebuild();
      }, { onlyOnce: true });
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  const searchFiltered = vencimentos.filter(v => {
    const matchSearch = !search || v.empresa?.toLowerCase().includes(search.toLowerCase()) || v.tipo?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "todos" || v.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    vencido: vencimentos.filter(v => v.status === "vencido").length,
    proximo: vencimentos.filter(v => v.status === "próximo").length,
    emDia: vencimentos.filter(v => v.status === "em dia").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-card-foreground">Vencimentos</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão consolidada de todos os vencimentos (licenças, certificados, procurações)</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card flex items-center justify-between cursor-pointer" onClick={() => setFilter("vencido")}>
          <div><p className="text-xs text-muted-foreground uppercase">Vencidos</p><p className="text-2xl font-bold text-destructive mt-1">{counts.vencido}</p></div>
          <AlertTriangle className="text-destructive" size={22} />
        </div>
        <div className="stat-card flex items-center justify-between cursor-pointer" onClick={() => setFilter("próximo")}>
          <div><p className="text-xs text-muted-foreground uppercase">Próximos</p><p className="text-2xl font-bold text-warning mt-1">{counts.proximo}</p></div>
          <Clock className="text-warning" size={22} />
        </div>
        <div className="stat-card flex items-center justify-between cursor-pointer" onClick={() => setFilter("em dia")}>
          <div><p className="text-xs text-muted-foreground uppercase">Em Dia</p><p className="text-2xl font-bold text-success mt-1">{counts.emDia}</p></div>
          <CheckCircle className="text-success" size={22} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <div className="flex gap-2">
          {["todos", "vencido", "próximo", "em dia"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="module-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Empresa</th><th>Tipo</th><th>Vencimento</th><th>Dias</th><th>Status</th></tr></thead>
          <tbody>
            {searchFiltered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum vencimento</td></tr>
            ) : searchFiltered.map((v, i) => (
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
