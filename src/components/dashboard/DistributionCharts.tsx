
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DistributionChartsProps {
  regimesData: { name: string; value: number }[];
}

const COLORS = ["hsl(var(--primary))", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"];

export const DistributionCharts: React.FC<DistributionChartsProps> = ({ regimesData }) => {
  return (
    <div className="card-premium h-full flex flex-col">
       <div className="mb-6">
        <h3 className="text-lg font-black text-foreground">Distribuição de Clientes</h3>
        <p className="text-xs text-muted-foreground font-medium">Divisão por Regime Tributário</p>
      </div>

      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={regimesData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={8}
              dataKey="value"
            >
              {regimesData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                borderColor: 'hsl(var(--border))', 
                borderRadius: '16px',
                borderWidth: '1px'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 700 }}
            />
            <Legend verticalAlign="bottom" align="center" iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
