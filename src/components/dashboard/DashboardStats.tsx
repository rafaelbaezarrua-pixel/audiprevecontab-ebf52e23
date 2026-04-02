
import React from "react";
import { Building2, Activity, DollarSign, Users, ClipboardList } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardStatsProps {
  stats: {
    totalEmpresas: number;
    ativas: number;
    processosAtivos: number;
    tarefasHoje: number;
  };
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const cards = [
    {
      label: "Total de Empresas",
      value: stats.totalEmpresas,
      icon: <Building2 className="w-6 h-6" />,
      color: "from-primary/20 to-primary/10",
      text: "text-primary",
    },
    {
      label: "Empresas Ativas",
      value: stats.ativas,
      icon: <Users className="w-6 h-6" />,
      color: "from-primary/15 to-primary/5",
      text: "text-primary",
    },
    {
      label: "Processos em Andamento",
      value: stats.processosAtivos,
      icon: <Activity className="w-6 h-6" />,
      color: "from-primary/20 to-primary/10",
      text: "text-primary",
    },
    {
      label: "Tarefas Pendentes Hoje",
      value: stats.tarefasHoje,
      icon: <ClipboardList className="w-6 h-6" />,
      color: "from-primary/15 to-primary/5",
      text: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="relative group overflow-hidden rounded-3xl border border-border/50 bg-card p-6 transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
        >
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {card.label}
              </p>
              <h3 className="text-2xl font-black text-foreground tracking-tight">
                {card.value}
              </h3>
            </div>
            <div className={`p-3 rounded-2xl bg-muted/50 ${card.text} shadow-inner`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
