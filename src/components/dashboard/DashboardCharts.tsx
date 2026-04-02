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

const COLORS = ['hsl(var(--primary))', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6'];

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
      <div className="module-card flex flex-col items-center">
        <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2 mb-6 w-full px-2">
           <Building2 size={20} className="text-primary" /> Distribuição por Regime (Ativas)
        </h3>
        
        {data.regimes.length === 0 ? (
           <div className="h-64 flex items-center justify-center text-muted-foreground w-full">
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
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
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
                   formatter={(value: number) => [`${value} Empresas`, 'Quantidade']}
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bar Chart: Processos Societários */}
      <div className="module-card flex flex-col items-center">
        <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2 mb-6 w-full px-2">
           <Activity size={20} className="text-primary" /> Processos Societários
        </h3>
        
        {data.processos.length === 0 ? (
           <div className="h-64 flex items-center justify-center text-muted-foreground w-full">
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                <Tooltip
                  cursor={{fill: '#F3F4F6'}}
                  formatter={(value: number) => [`${value} Processos`, 'Quantidade']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {data.processos.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Concluídos' ? '#10B981' : entry.name === 'Em Exigência' ? '#EF4444' : 'hsl(var(--primary))'} 
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

