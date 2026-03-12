
import React from "react";
import KanbanBoard, { KanbanColumn, KanbanItem } from "../KanbanBoard";
import { Processo } from "@/types/societario";
import { passosConfig, tipoProcessoLabels } from "@/constants/societario";
import { format } from "date-fns";
import { Building2, Calendar, MoreVertical } from "lucide-react";

interface SocietarioKanbanProps {
  processos: Processo[];
  onUpdateStatus: (itemId: string, newStatus: string) => void;
  onViewDetails: (processo: Processo) => void;
}

export const SocietarioKanban: React.FC<SocietarioKanbanProps> = ({ 
  processos, 
  onUpdateStatus,
  onViewDetails
}) => {
  const columns: KanbanColumn[] = [
    { id: "pending", title: "Novos / Pendentes", colorClass: "bg-blue-500/10 text-blue-600" },
    ...passosConfig.map(p => ({
      id: p.id,
      title: p.label,
      colorClass: "bg-primary/10 text-primary"
    })),
    { id: "concluido", title: "Concluídos", colorClass: "bg-emerald-500/10 text-emerald-600" }
  ];

  const getProcessoStatus = (p: Processo): string => {
    if (p.foi_arquivado) return "concluido";
    
    // Find the latest completed step
    const completedSteps = passosConfig.filter(step => !!(p as any)[step.id]);
    if (completedSteps.length === 0) return "pending";
    
    return completedSteps[completedSteps.length - 1].id;
  };

  const kanbanItems: KanbanItem[] = processos.map(p => ({
    id: p.id,
    status: getProcessoStatus(p),
    renderContent: () => (
      <div 
        className="p-4 space-y-3 cursor-pointer"
        onClick={() => onViewDetails(p)}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
            p.tipo === 'abertura' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {tipoProcessoLabels[p.tipo] || p.tipo}
          </span>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreVertical size={14} />
          </button>
        </div>

        <div>
          <h4 className="text-sm font-bold text-foreground line-clamp-2 leading-tight">
            {p.nome_empresa || "Sem Nome"}
          </h4>
          {p.numero_processo && (
            <p className="text-[10px] font-mono text-muted-foreground mt-1">
              Prot: {p.numero_processo}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar size={12} />
            <span className="text-[10px] font-bold">
              {format(new Date(p.data_inicio), "dd/MM")}
            </span>
          </div>
          
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary">
              {p.nome_empresa?.charAt(0) || "?"}
            </div>
          </div>
        </div>
        
        {p.em_exigencia && (
          <div className="bg-destructive/10 text-destructive text-[10px] font-black p-2 rounded-lg flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
             EM EXIGÊNCIA
          </div>
        )}
      </div>
    )
  }));

  const handleDragEnd = (itemId: string, newStatus: string) => {
    // If dropping to "concluido", we set foi_arquivado to true
    if (newStatus === "concluido") {
      onUpdateStatus(itemId, "foi_arquivado");
    } else if (newStatus === "pending") {
      // Logic to clear steps? Maybe just set current_step
       onUpdateStatus(itemId, "pending");
    } else {
      onUpdateStatus(itemId, newStatus);
    }
  };

  return (
    <div className="h-[calc(100vh-250px)]">
      <KanbanBoard 
        columns={columns}
        items={kanbanItems}
        onDragEnd={handleDragEnd}
      />
    </div>
  );
};
