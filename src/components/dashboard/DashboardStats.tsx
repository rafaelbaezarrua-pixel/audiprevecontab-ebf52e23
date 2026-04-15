
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
      label: "TOTAL DE EMPRESAS",
      value: stats.totalEmpresas,
      icon: <Building2 className="w-5 h-5" />,
      text: "text-primary",
    },
    {
      label: "EMPRESAS ATIVAS",
      value: stats.ativas,
      icon: <Users className="w-5 h-5" />,
      text: "text-primary",
    },
    {
      label: "PROCESSOS ATIVOS",
      value: stats.processosAtivos,
      icon: <Activity className="w-5 h-5" />,
      text: "text-primary",
    },
    {
      label: "TAREFAS PENDENTES",
      value: stats.tarefasHoje,
      icon: <ClipboardList className="w-5 h-5" />,
      text: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="glass-card group p-6 transition-all border-border/10 hover:border-border/30"
        >
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 italic">
                {card.label}
              </p>
              <h3 className="text-3xl font-black text-foreground tracking-tighter">
                {card.value}
              </h3>
            </div>
            <div className={`p-3 rounded-xl bg-black/5 dark:bg-white/5 ${card.text} shadow-none`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
