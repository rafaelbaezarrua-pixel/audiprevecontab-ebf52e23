
import React from "react";
import { DollarSign, CheckCircle, Clock, TrendingUp } from "lucide-react";

interface HonorariosStatsProps {
  totalValorAgregado: number;
  totalPago: number;
  totalPendente: number;
  eficienciaCobranca: number;
  competencia: string;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const HonorariosStats = ({ 
  totalValorAgregado, 
  totalPago, 
  totalPendente, 
  eficienciaCobranca,
  competencia
}: HonorariosStatsProps) => {
  const items = [
    { label: "Faturamento Mensal", value: totalValorAgregado, color: "border-l-indigo-500", textColor: "text-card-foreground", icon: DollarSign, iconColor: "text-indigo-500", bgIcon: "bg-indigo-500/10", note: `Total gerado em ${competencia}` },
    { label: "Total Recebido", value: totalPago, color: "border-l-emerald-500", textColor: "text-emerald-600", icon: CheckCircle, iconColor: "text-emerald-500", bgIcon: "bg-emerald-500/10", note: "Valores confirmados" },
    { label: "Previsão Pendente", value: totalPendente, color: "border-l-amber-500", textColor: "text-amber-600", icon: Clock, iconColor: "text-amber-500", bgIcon: "bg-amber-500/10", note: "Aguardando pagamento" },
    { label: "Eficiência", value: `${eficienciaCobranca}%`, color: "border-l-primary", textColor: "text-primary", icon: TrendingUp, iconColor: "text-primary", bgIcon: "bg-primary/10", note: "Taxa de recebimento" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <div key={idx} className={`bg-card border border-border rounded-xl p-5 shadow-sm border-l-4 ${item.color}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
            <div className={`w-8 h-8 rounded-lg ${item.bgIcon} flex items-center justify-center`}>
              <item.icon size={16} className={item.iconColor} />
            </div>
          </div>
          <p className={`text-2xl font-black ${item.textColor}`}>
            {typeof item.value === 'number' ? formatCurrency(item.value) : item.value}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">{item.note}</p>
        </div>
      ))}
    </div>
  );
};
