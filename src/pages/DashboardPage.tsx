import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Clock, AlertTriangle, Award, DollarSign, PieChart as PieChartIcon, TrendingUp, Users, Trash2, FileText } from "lucide-react";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/PageSkeleton";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

const DashboardPage: React.FC = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState({ total: 0, ativas: 0, paralisadas: 0, baixadas: 0 });
  const [honorariosData, setHonorariosData] = useState({ total: 0, pago: 0, pendente: 0 });
  const [regimesData, setRegimesData] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      
      // 1. Get recent companies
      const { data: recents } = await supabase.from("empresas").select("id, nome_empresa, cnpj, situacao").order("created_at", { ascending: false }).limit(10);
      if (mounted) setEmpresas(recents || []);

      // 2. Get all companies for status and regime analysis
      const { data: allEmpresas } = await supabase.from("empresas").select("situacao, regime_tributario");
      if (allEmpresas && mounted) {
        let ativas = 0, paralisadas = 0, baixadas = 0;
        const regimes: Record<string, number> = {};
        
        allEmpresas.forEach(emp => {
          if (!emp.situacao || emp.situacao === 'ativa') ativas++;
          else if (emp.situacao === 'paralisada') paralisadas++;
          else if (emp.situacao === 'baixada') baixadas++;
          
          const regime = emp.regime_tributario || "Não Inf.";
          regimes[regime] = (regimes[regime] || 0) + 1;
        });
        
        setStats({ total: allEmpresas.length, ativas, paralisadas, baixadas });
        setRegimesData(Object.entries(regimes).map(([name, value]) => ({ name, value })));
      }

      // 3. Get Honorários Stats
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: honorarios } = await supabase.from("honorarios_mensal").select("valor_total, pago").eq("competencia", currentMonth);
      if (honorarios && mounted) {
        const total = honorarios.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
        const pago = honorarios.filter(h => h.pago).reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
        setHonorariosData({ total, pago, pendente: total - pago });
      }

      if (mounted) setLoading(false);
    };
    load();

    return () => { mounted = false; };
  }, []);

  const COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#3B82F6"];

  const statCards = [
    { label: "Total de Empresas", value: stats.total, icon: <Building2 size={24} />, color: "bg-primary/20 text-primary", border: "border-primary/20" },
    { label: "Empresas Ativas", value: stats.ativas, icon: <Building2 size={24} />, color: "bg-emerald-500/20 text-emerald-500", border: "border-emerald-500/20" },
    { label: "Empresas Paralisadas", value: stats.paralisadas, icon: <AlertTriangle size={24} />, color: "bg-amber-500/20 text-amber-500", border: "border-amber-500/20" },
    { label: "Empresas Baixadas", value: stats.baixadas, icon: <Trash2 size={24} />, color: "bg-destructive/20 text-destructive", border: "border-destructive/20" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="stat-card h-24 animate-pulse bg-muted" />)}
          </div>
          <TableSkeleton rows={5} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className={`stat-card border-l-4 ${card.border} transition-all hover:scale-[1.02] hover:shadow-lg bg-card/50 backdrop-blur-sm`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{card.label}</p>
                    <h3 className="text-xl font-black text-card-foreground mt-1">{card.value}</h3>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.color} shadow-inner`}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 module-card border border-border/50 shadow-xl overflow-hidden group">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-lg font-black text-card-foreground flex items-center gap-2">
                  <Building2 size={20} className="text-primary" /> Empresas Recentes
                </h3>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors cursor-default">Últimas 10</span>
              </div>
              {empresas.length === 0 ? (
                <p className="text-muted-foreground text-sm py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">Nenhuma empresa cadastrada</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-5 py-4 font-bold tracking-tight">Empresa</th>
                        <th className="px-5 py-4 font-bold tracking-tight">CNPJ</th>
                        <th className="px-5 py-4 font-bold tracking-tight text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card/20">
                      {empresas.map((emp) => (
                        <tr key={emp.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-5 py-4 font-bold text-card-foreground">{emp.nome_empresa || "—"}</td>
                          <td className="px-5 py-4 text-muted-foreground font-medium">{emp.cnpj || "—"}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              emp.situacao === "baixada" ? "bg-destructive/10 text-destructive border border-destructive/20" : 
                              emp.situacao === "paralisada" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : 
                              "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            }`}>
                              {emp.situacao || "Ativa"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="module-card border border-border/50 bg-card/30 backdrop-blur-md">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-card-foreground flex items-center gap-2">
                    <PieChartIcon size={20} className="text-primary" /> Regimes Tributários
                  </h3>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={regimesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {regimesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="module-card border border-border/50 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
                <h3 className="text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Ações Rápidas
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => window.location.href='/societario/nova'} className="p-3 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 text-center h-24">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Building2 size={16} />
                    </div>
                    <span className="text-xs font-bold text-card-foreground">Nova Empresa</span>
                  </button>
                  <button onClick={() => window.location.href='/configuracoes/usuarios/novo'} className="p-3 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 text-center h-24">
                    <div className="w-8 h-8 rounded-full bg-info/10 text-info flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users size={16} />
                    </div>
                    <span className="text-xs font-bold text-card-foreground">Novo Usuário</span>
                  </button>
                  <button onClick={() => window.location.href='/honorarios'} className="p-3 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 text-center h-24">
                    <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center group-hover:scale-110 transition-transform">
                      <DollarSign size={16} />
                    </div>
                    <span className="text-xs font-bold text-card-foreground">Honorários</span>
                  </button>
                  <button onClick={() => window.location.href='/relatorios'} className="p-3 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 text-center h-24">
                    <div className="w-8 h-8 rounded-full bg-warning/10 text-warning flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText size={16} />
                    </div>
                    <span className="text-xs font-bold text-card-foreground">Relatórios</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
