
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
    entregues: number;
    mei: number;
  };
}

export const SocietarioStats = ({ stats }: SocietarioStatsProps) => {
  const items: StatItem[] = [
    { label: "Ativas", value: stats.ativas, cls: "text-emerald-500", bg: "bg-emerald-500/10", icon: Building2 },
    { label: "MEI", value: stats.mei, cls: "text-sky-500", bg: "bg-sky-500/10", icon: Activity },
    { label: "Paralisadas", value: stats.paralisadas, cls: "text-amber-500", bg: "bg-amber-500/10", icon: AlertCircle },
    { label: "Baixadas", value: stats.baixadas, cls: "text-rose-500", bg: "bg-rose-500/10", icon: X },
    { label: "Entregues", value: stats.entregues, cls: "text-indigo-500", bg: "bg-indigo-500/10", icon: Building2 }
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((s) => (
        <div 
          key={s.label} 
          className="flex-1 min-w-[120px] h-11 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl flex items-center justify-between px-4 group hover:bg-black/20 dark:hover:bg-white/10 transition-all shadow-inner"
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${s.bg} ${s.cls} shadow-sm active:scale-90 transition-transform`}>
              <s.icon size={13} />
            </div>
            <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">{s.label}</span>
          </div>
          <span className={`text-[13px] font-black ${s.cls} tabular-nums group-hover:scale-110 transition-transform`}>{s.value}</span>
        </div>
      ))}
    </div>
  );
};
