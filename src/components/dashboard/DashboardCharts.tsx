import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Building2, Activity } from 'lucide-react';

interface ChartData {
  regimes: { name: string; value: number }[];
  processos: { name: string; value: number }[];
}

interface DashboardChartsProps {
  data: ChartData;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary) / 0.7)', 'hsl(var(--primary) / 0.5)', 'hsl(var(--primary) / 0.35)', 'hsl(var(--primary) / 0.2)'];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data }) => {
  const navigate = useNavigate();

  const handleRegimeClick = (entry: { name: string; value: number }) => {
    const regimeMap: Record<string, string> = {
      'Simples Nacional': 'simples',
      'Lucro Presumido': 'lucro_presumido',
      'Lucro Real': 'lucro_real',
      'MEI': 'mei',
      'Outros': 'todos'
    };
    const regime = regimeMap[entry.name] || 'todos';
    navigate(`/societario?view=empresas&regime=${regime}&aba=${regime === 'mei' ? 'mei' : 'ativas'}`);
  };

  const handleProcessoClick = (entry: { name: string; value: number }) => {
    navigate(`/societario?view=processos`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Donut Chart: Regimes Tributários */}
      <div className="glass-card flex flex-col items-center p-8 border-border/10">
        <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] italic flex items-center gap-2 mb-10 w-full">
           <Building2 size={16} className="text-primary" /> Distribuição por Regime (Ativas)
        </h3>
        
        {data.regimes.length === 0 ? (
           <div className="h-64 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 w-full italic">
             Sem dados suficientes
           </div>
        ) : (
          <div className="h-72 w-full cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.regimes}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  onClick={handleRegimeClick}
                >
                  {data.regimes.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      className="hover:opacity-80 transition-opacity outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip 
                   formatter={(value: number) => [`${value} Empresas`, 'TOTAL']}
                   contentStyle={{ backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'none' }}
                   itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bar Chart: Processos Societários */}
      <div className="glass-card flex flex-col items-center p-8 border-border/10">
        <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] italic flex items-center gap-2 mb-10 w-full">
           <Activity size={16} className="text-primary" /> Fluxo de Processos Societários
        </h3>
        
        {data.processos.length === 0 ? (
           <div className="h-64 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 w-full italic">
             Sem dados suficientes
           </div>
        ) : (
          <div className="h-72 w-full cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.processos}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                onClick={(chartData) => {
                  if (chartData && chartData.activePayload && chartData.activePayload.length > 0) {
                    const payload = chartData.activePayload[0].payload as { name: string; value: number };
                    handleProcessoClick(payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,120,120,0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontWeight: 900}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontWeight: 900}} />
                <Tooltip
                  cursor={{fill: 'rgba(0,0,0,0.03)'}}
                  formatter={(value: number) => [`${value} Processos`, 'TOTAL']}
                  contentStyle={{ backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'none' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={40}>
                  {data.processos.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`hsl(var(--primary) / ${1 - (index * 0.15)})`} 
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

