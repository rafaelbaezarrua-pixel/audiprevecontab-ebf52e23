
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
          className="flex-1 min-w-[140px] h-20 bg-card border border-border/10 rounded-2xl flex items-center px-5 group hover:bg-black/[0.02] dark:hover:bg-white/[0.05] transition-all shadow-sm border-b-2 border-b-primary/5 gap-4"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg} ${s.cls} shadow-sm active:scale-90 transition-transform`}>
            <s.icon size={18} />
          </div>
          
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.15em] truncate">{s.label}</span>
            <span className={`text-[20px] font-black ${s.cls} tabular-nums leading-none tracking-tighter group-hover:scale-105 origin-left transition-transform`}>
              {s.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
