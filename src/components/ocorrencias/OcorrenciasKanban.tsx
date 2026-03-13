import React from "react";
import KanbanBoard, { KanbanColumn, KanbanItem } from "../KanbanBoard";
import { format } from "date-fns";
import { Building2, Calendar, Download, Trash2, User } from "lucide-react";

interface Ocorrencia {
    id: string;
    empresa_id: string;
    departamento: string;
    descricao: string;
    cidade: string;
    estado: string;
    data_ocorrencia: string;
    status: string; // pendente, em_andamento, concluido
    created_at: string;
    empresas: {
        nome_empresa: string;
        cnpj: string | null;
    };
}

interface OcorrenciasKanbanProps {
  ocorrencias: Ocorrencia[];
  onUpdateStatus: (itemId: string, newStatus: string) => void;
  onGeneratePdf: (ocorrencia: Ocorrencia) => void;
  onDelete: (id: string) => void;
}

export const OcorrenciasKanban: React.FC<OcorrenciasKanbanProps> = ({ 
  ocorrencias, 
  onUpdateStatus,
  onGeneratePdf,
  onDelete
}) => {
  const columns: KanbanColumn[] = [
    { id: "pendente", title: "Pendente", colorClass: "bg-orange-500/10 text-orange-600" },
    { id: "em_andamento", title: "Em Andamento", colorClass: "bg-blue-500/10 text-blue-600" },
    { id: "concluido", title: "Concluído", colorClass: "bg-emerald-500/10 text-emerald-600" }
  ];

  const kanbanItems: KanbanItem[] = ocorrencias.map(o => ({
    id: o.id,
    status: o.status || "pendente", // Default fallback
    renderContent: () => (
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {o.departamento}
          </span>
          <div className="flex items-center gap-1">
            <button 
                onClick={() => onGeneratePdf(o)}
                className="text-muted-foreground hover:text-primary transition-colors p-1"
                title="Gerar PDF"
            >
                <Download size={14} />
            </button>
            <button 
                onClick={() => onDelete(o.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                title="Excluir Ocorrência"
            >
                <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div>
           <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground font-medium">
               <Building2 size={12} /> {o.empresas.nome_empresa}
           </div>
           <p className="text-sm font-bold text-foreground line-clamp-3 leading-tight">
             {o.descricao}
           </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar size={12} />
            <span className="text-[10px] font-bold">
              {format(new Date(o.data_ocorrencia + "T12:00:00"), "dd/MM/yyyy")}
            </span>
          </div>
        </div>
      </div>
    )
  }));

  return (
    <div className="h-[calc(100vh-250px)]">
      <KanbanBoard 
        columns={columns}
        items={kanbanItems}
        onDragEnd={onUpdateStatus}
      />
    </div>
  );
};
