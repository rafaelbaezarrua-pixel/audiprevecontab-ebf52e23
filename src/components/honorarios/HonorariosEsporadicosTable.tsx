
import React from "react";
import { Trash2 } from "lucide-react";
import { ServicoEsporadico } from "@/types/honorarios";

interface HonorariosEsporadicosTableProps {
  data: ServicoEsporadico[];
  competencia: string;
  onTogglePago: (id: string, currentValue: boolean) => void;
  onDelete: (id: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const HonorariosEsporadicosTable = ({ data, competencia, onTogglePago, onDelete }: HonorariosEsporadicosTableProps) => {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-tighter text-muted-foreground border-b border-border">
          <tr>
            <th className="px-5 py-4">Cliente / Documento</th>
            <th className="px-5 py-4">Serviço</th>
            <th className="px-5 py-4 text-right">Valor</th>
            <th className="px-5 py-4 text-center">Status</th>
            <th className="px-5 py-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">Nenhum serviço esporádico para esta competência {competencia}.</td></tr>
          ) : (
            data.map(item => (
              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-bold text-card-foreground">{item.nome_cliente}</p>
                  <p className="text-[10px] text-muted-foreground">{item.cpf_cnpj || '—'}</p>
                </td>
                <td className="px-5 py-4 font-medium text-muted-foreground">{item.tipo_servico}</td>
                <td className="px-5 py-4 font-black text-primary text-right">{formatCurrency(item.valor)}</td>
                <td className="px-5 py-4 text-center">
                  <button 
                    onClick={() => item.id && onTogglePago(item.id, item.pago)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest transition-all ${item.pago ? 'bg-emerald-500 text-white shadow-sm' : 'bg-muted text-muted-foreground border border-border'}`}
                  >
                    {item.pago ? 'PAGO' : 'PENDENTE'}
                  </button>
                </td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => item.id && onDelete(item.id)} className="text-destructive p-2 hover:bg-destructive/10 rounded-lg transition-all" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
