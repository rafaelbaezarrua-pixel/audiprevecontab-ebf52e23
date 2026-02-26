import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, ref, onValue } from "@/lib/firebase";
import { Building2, Clock, AlertTriangle, Award, FileText } from "lucide-react";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj?: string;
  status?: string;
}

const DashboardPage: React.FC = () => {
  const { userData } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [stats, setStats] = useState({ total: 0, ativas: 0, inativas: 0, paralisadas: 0 });

  useEffect(() => {
    const empresasRef = ref(db, "empresas");
    const unsub = onValue(empresasRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
      setEmpresas(list);
      setStats({
        total: list.length,
        ativas: list.filter((e: any) => !e.status || e.status === "ativa").length,
        inativas: list.filter((e: any) => e.status === "inativa").length,
        paralisadas: list.filter((e: any) => e.status === "paralisada").length,
      });
    });
    return () => unsub();
  }, []);

  const statCards = [
    { label: "Total de Empresas", value: stats.total, icon: <Building2 size={22} />, color: "bg-primary/10 text-primary" },
    { label: "Empresas Ativas", value: stats.ativas, icon: <Award size={22} />, color: "bg-success/10 text-success" },
    { label: "Empresas Inativas", value: stats.inativas, icon: <Clock size={22} />, color: "bg-warning/10 text-warning" },
    { label: "Paralisadas", value: stats.paralisadas, icon: <AlertTriangle size={22} />, color: "bg-destructive/10 text-destructive" },
  ];

  const moduleStatus = [
    { name: "Societário", access: userData?.modules.societario },
    { name: "Fiscal", access: userData?.modules.fiscal },
    { name: "Pessoal", access: userData?.modules.pessoal },
    { name: "Certificados", access: userData?.modules.certificados },
    { name: "Procurações", access: userData?.modules.procuracoes },
    { name: "Vencimentos", access: userData?.modules.vencimentos },
    { name: "Parcelamentos", access: userData?.modules.parcelamentos },
    { name: "Honorários", access: userData?.modules.honorarios },
    { name: "Recálculos", access: userData?.modules.recalculos },
    { name: "Obrigações", access: userData?.modules.obrigacoes },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                <h3 className="text-2xl font-bold text-card-foreground mt-1">{card.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions */}
      <div className="module-card">
        <h3 className="text-lg font-bold text-card-foreground mb-4">Suas Permissões</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {moduleStatus.map((m) => (
            <div key={m.name} className={`flex items-center gap-2 p-3 rounded-lg border ${m.access ? "border-success/30 bg-success/5" : "border-border bg-muted/30"}`}>
              <div className={`w-2 h-2 rounded-full ${m.access ? "bg-success" : "bg-muted-foreground"}`} />
              <span className={`text-sm font-medium ${m.access ? "text-card-foreground" : "text-muted-foreground"}`}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent companies */}
      <div className="module-card">
        <h3 className="text-lg font-bold text-card-foreground mb-4">Empresas Recentes</h3>
        {empresas.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma empresa cadastrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>CNPJ</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {empresas.slice(0, 10).map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-medium text-card-foreground">{emp.nomeEmpresa || "—"}</td>
                    <td className="text-muted-foreground">{emp.cnpj || "—"}</td>
                    <td>
                      <span className={`badge-status ${emp.status === "inativa" ? "badge-warning" : emp.status === "paralisada" ? "badge-danger" : "badge-success"}`}>
                        {emp.status || "Ativa"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
