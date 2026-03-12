
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { AlertsSidebar } from "@/components/dashboard/AlertsSidebar";
import { useDashboard } from "@/hooks/useDashboard";
import { PageHeaderSkeleton } from "@/components/PageSkeleton";
import { Sparkles, ArrowUpRight } from "lucide-react";

const DashboardPage: React.FC = () => {
  const { userData } = useAuth();
  const { stats, alerts, loading } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-3xl bg-muted animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] rounded-3xl bg-muted animate-pulse" />
          <div className="h-[400px] rounded-3xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              Dashboard <span className="text-primary">Audipreve</span>
            </h1>
            <div className="p-1 rounded-lg bg-primary/10 text-primary animate-pulse">
              <Sparkles size={16} />
            </div>
          </div>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            Bem-vindo de volta, <span className="text-foreground font-bold">{userData?.nome?.split(' ')[0]}</span>! Aqui está o resumo de hoje.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-2xl bg-muted/50 border border-border/50">
          <button className="px-4 py-2 text-xs font-bold rounded-xl bg-card text-foreground shadow-sm">Vista Geral</button>
          <button className="px-4 py-2 text-xs font-bold rounded-xl text-muted-foreground hover:text-foreground transition-all">Relatórios</button>
        </div>
      </div>

      {/* Main Stats */}
      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3">
          <AlertsSidebar alerts={alerts} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
