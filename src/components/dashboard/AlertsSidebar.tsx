
import React from "react";
import { Bell, Calendar, ShieldAlert, ChevronRight } from "lucide-react";

interface AlertsSidebarProps {
  alerts: {
    id: string;
    type: 'expiring' | 'deadline';
    title: string;
    description: string;
    date?: string;
  }[];
}

export const AlertsSidebar: React.FC<AlertsSidebarProps> = ({ alerts }) => {
  const tarefas = alerts.filter(a => a.type === 'deadline');
  const vencimentos = alerts.filter(a => a.type === 'expiring');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-foreground flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" /> Central Operacional
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna de Tarefas */}
        <div className="card-premium border-l-4 border-l-primary flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-tighter">
              <Calendar className="w-4 h-4 text-primary" /> Tarefas de Hoje
            </h4>
            <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
              {tarefas.length}
            </span>
          </div>
          
          <div className="space-y-3 flex-1 mb-6">
            {tarefas.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center italic">Nenhuma tarefa para hoje.</p>
            ) : (
              tarefas.map(a => (
                <div key={a.id} className="p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                  <h5 className="text-xs font-bold truncate">{a.title}</h5>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{a.description}</p>
                </div>
              ))
            )}
          </div>

          <button 
            onClick={() => window.location.href = '/agendamentos'}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-sm"
          >
            Ver Todos os Agendamentos
          </button>
        </div>

        {/* Coluna de Alertas/Vencimentos */}
        <div className="card-premium border-l-4 border-l-amber-500 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-tighter">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Alertas & Vencimentos
            </h4>
            <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black px-2 py-0.5 rounded-full">
              {vencimentos.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {vencimentos.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center italic">Nenhum alerta pendente.</p>
            ) : (
              vencimentos.map(a => (
                <div key={a.id} className="p-3 rounded-xl bg-muted/30 border border-transparent hover:border-amber-500/20 transition-all cursor-pointer">
                  <h5 className="text-xs font-bold truncate">{a.title}</h5>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{a.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
