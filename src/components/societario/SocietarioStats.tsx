
import React from "react";
import { Building2, Activity, AlertCircle, X, LucideIcon } from "lucide-react";

interface StatItem {
  label: string;
  value: number;
  cls: string;
  bg: string;
  icon: LucideIcon;
}

interface SocietarioStatsProps {
  stats: {
    ativas: number;
    paralisadas: number;
    baixadas: number;
    mei: number;
  };
}

export const SocietarioStats = ({ stats }: SocietarioStatsProps) => {
  const items: StatItem[] = [
    { label: "Ativas", value: stats.ativas, cls: "text-success", bg: "bg-success/10", icon: Building2 },
    { label: "MEI", value: stats.mei, cls: "text-info", bg: "bg-info/10", icon: Activity },
    { label: "Paralisadas", value: stats.paralisadas, cls: "text-warning", bg: "bg-warning/10", icon: AlertCircle },
    { label: "Baixadas", value: stats.baixadas, cls: "text-destructive", bg: "bg-destructive/10", icon: X }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((s) => (
        <div key={s.label} className="card-premium group">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-2xl ${s.bg} ${s.cls} group-hover:scale-110 transition-transform shadow-sm`}>
              <s.icon size={20} />
            </div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{s.label}</span>
          </div>
          <p className="text-4xl font-black text-card-foreground group-hover:text-primary transition-colors duration-500">{s.value}</p>
        </div>
      ))}
    </div>
  );
};
