
import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
  data: {
    month: string;
    total: number;
    pago: number;
  }[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <div className="card-premium h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-black text-foreground flex items-center gap-2">
            Desempenho Financeiro
          </h3>
          <p className="text-xs text-muted-foreground font-medium">Faturamento vs Recebimento (Últimos 6 meses)</p>
        </div>
      </div>
      
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorPago" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(v) => `R$ ${v/1000}k`}
            />
            <Tooltip 
              cursor={{ fill: 'hsl(var(--muted)/0.4)', radius: 8 }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                borderColor: 'hsl(var(--border))', 
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                borderWidth: '1px'
              }}
              formatter={(value: number) => [formatCurrency(value), '']}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            <Bar 
              name="Total Gerado" 
              dataKey="total" 
              fill="url(#colorTotal)" 
              radius={[6, 6, 0, 0]} 
              barSize={20}
            />
            <Bar 
              name="Total Recebido" 
              dataKey="pago" 
              fill="url(#colorPago)" 
              radius={[6, 6, 0, 0]} 
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
