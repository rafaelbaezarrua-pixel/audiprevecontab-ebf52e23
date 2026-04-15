
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { AlertsSidebar } from "@/components/dashboard/AlertsSidebar";
import { useDashboard } from "@/hooks/useDashboard";
import { PageHeaderSkeleton } from "@/components/PageSkeleton";
import { Sparkles, ArrowUpRight, FileUp } from "lucide-react";

const DashboardPage: React.FC = () => {
  const { userData } = useAuth();
  const { stats, analytics, alerts, loading } = useDashboard(userData?.userId);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-3xl bg-muted" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] rounded-3xl bg-muted" />
          <div className="h-[400px] rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 animate-fade-in relative">
      {/* Welcome Header */}
      <div className="glass-header sticky top-0 z-10 -mx-4 -mt-4 px-6 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/10">
            <LayoutDashboard size={28} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic px-0">
              Gestão <span className="text-primary/90">Estratégica</span>
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase italic">
              Bem-vindo, <span className="text-foreground">{userData?.nome?.split(' ')[0]}</span> • Painel de Controle
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/10">
          <button className="px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg bg-card text-primary shadow-sm border border-border/10 transition-all">Vista Geral</button>
          <button className="px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-card/50 transition-all">Relatórios</button>
        </div>
      </div>

      {/* Main Stats */}
      <DashboardStats stats={stats} />

      {/* BI Analytics Charts */}
      {analytics && <DashboardCharts data={analytics} />}

      <div className="grid grid-cols-1 gap-8 mt-4">
        <div className="glass-card p-8 border-border/10">
          <AlertsSidebar alerts={alerts} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
