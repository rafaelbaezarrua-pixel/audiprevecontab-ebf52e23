
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
    <div className="space-y-8 pb-10 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="header-title">
              Dashboard <span className="text-primary/90">Audipreve</span>
            </h1>
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary animate-pulse">
              <Sparkles size={20} />
            </div>
          </div>
          <p className="subtitle-premium flex items-center gap-2">
            Bem-vindo de volta, <span className="text-card-foreground font-bold">{userData?.nome?.split(' ')[0]}</span>! Aqui está o resumo de hoje.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/30 border border-border/50 shadow-sm">
          <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-card text-primary shadow-sm ring-1 ring-border transition-all">Vista Geral</button>
          <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all">Relatórios</button>
        </div>
      </div>

      {/* Main Stats */}
      <DashboardStats stats={stats} />

      {/* BI Analytics Charts */}
      {analytics && <DashboardCharts data={analytics} />}

      <div className="grid grid-cols-1 gap-8 mt-4">
        <div className="lg:col-span-1 border border-border/50 rounded-3xl p-6 bg-card">
          <AlertsSidebar alerts={alerts} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
