
import React from "react";
import { format } from "date-fns";
import { CheckCircle, Clock } from "lucide-react";
import { HonorarioMensal } from "@/types/honorarios";

interface HonorariosMensalTableProps {
  data: HonorarioMensal[];
  competencia: string;
  onTogglePago: (id: string, currentValue: boolean) => void;
  onToggleStatus: (id: string, currentValue: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const HonorariosMensalTable = ({ data, competencia, onTogglePago, onToggleStatus }: HonorariosMensalTableProps) => {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-4 font-semibold">Empresa</th>
              <th className="px-5 py-4 font-semibold text-right">Valor Calculado</th>
              <th className="px-5 py-4 font-semibold text-center">Vencimento</th>
              <th className="px-5 py-4 font-semibold text-center">Status</th>
              <th className="px-5 py-4 font-semibold text-center">Pagamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                  Nenhum honorário registrado para a competência {competencia}.
                </td>
              </tr>
            ) : (
              data.map((record) => (
                <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-medium text-card-foreground">
                    {record.empresas?.nome_empresa}
                  </td>
                  <td className="px-5 py-4 font-bold text-primary text-right">
                    {formatCurrency(record.valor_total)}
                  </td>
                  <td className="px-5 py-4 text-center text-muted-foreground">
                    {record.data_vencimento ? format(new Date(record.data_vencimento), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => record.id && onToggleStatus(record.id, record.status)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                        record.status === "enviada" 
                          ? "bg-success/20 text-success border-success/30 hover:bg-success/30" 
                          : "bg-warning/20 text-warning border-warning/30 hover:bg-warning/30"
                      }`}
                    >
                      {record.status === "enviada" ? "ENVIADO" : "PENDENTE"}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => record.id && onTogglePago(record.id, record.pago)}
                      className={`flex items-center gap-2 justify-center w-32 mx-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        record.pago
                          ? "bg-success text-success-foreground shadow-md hover:bg-success/90"
                          : "bg-muted text-muted-foreground border border-border hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {record.pago ? <><CheckCircle size={14} /> PAGO</> : <><Clock size={14} /> PENDENTE</>}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
