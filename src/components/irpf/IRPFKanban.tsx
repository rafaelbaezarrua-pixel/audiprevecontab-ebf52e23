
import React from "react";
import KanbanBoard, { KanbanColumn, KanbanItem } from "../KanbanBoard";
import { IRPFRecord } from "@/types/irpf";
import { format } from "date-fns";
import { User, Calendar, DollarSign, Send } from "lucide-react";
import { formatCurrency, maskCPF } from "@/lib/utils";

interface IRPFKanbanProps {
  records: IRPFRecord[];
  onUpdateStatus: (id: string, newStatus: string) => void;
  onViewDetails: (record: IRPFRecord) => void;
}

export const IRPFKanban: React.FC<IRPFKanbanProps> = ({ 
  records, 
  onUpdateStatus,
  onViewDetails
}) => {
  const columns: KanbanColumn[] = [
    { id: "pendente", title: "Pendente", colorClass: "bg-amber-500/10 text-amber-600" },
    { id: "em_processamento", title: "Em Processamento", colorClass: "bg-blue-500/10 text-blue-600" },
    { id: "transmitida", title: "Transmitida", colorClass: "bg-emerald-500/10 text-emerald-600" },
    { id: "exigencia", title: "Exigência", colorClass: "bg-destructive/10 text-destructive" }
  ];

  const kanbanItems: KanbanItem[] = records.map(r => ({
    id: r.id,
    status: r.status_transmissao || "pendente",
    renderContent: () => (
      <div 
        className="p-4 space-y-3 cursor-pointer group"
        onClick={() => onViewDetails(r)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5 p-1 px-2 rounded-lg bg-muted/50 text-[10px] font-black uppercase tracking-tighter">
            <Calendar size={10} /> {r.ano_exercicio}
          </div>
          {r.status_pago ? (
            <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Pago</span>
          ) : (
             <span className="bg-amber-500/10 text-amber-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Pendente Pgto</span>
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
            {r.nome_completo}
          </h4>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
            {r.cpf ? maskCPF(r.cpf) : "CPF não informado"}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold">
              {formatCurrency(r.valor_a_pagar)}
            </span>
          </div>
          
          {r.data_transmissao && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
              <Send size={10} />
              {format(new Date(r.data_transmissao), "dd/MM")}
            </div>
          )}
        </div>
      </div>
    )
  }));

  const handleDragEnd = (id: string, newStatus: string) => {
    onUpdateStatus(id, newStatus);
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
