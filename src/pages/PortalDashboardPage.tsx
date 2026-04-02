import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    Building2, FileText, CheckCircle, AlertCircle,
    ArrowRight, Download, MessageSquare, Clock, Search,
    History, Calendar, PenTool, TrendingUp
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Line,
    ComposedChart,
    Area,
    AreaChart
} from "recharts";
import { format, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const PortalDashboardPage: React.FC = () => {
    const { userData } = useAuth();
    const [empresa, setEmpresa] = React.useState<any>(null);
    const [counts, setCounts] = React.useState({ lics: 0, certs: 0, msgs: 0, pendingSigs: 0 });
    const [recentDocs, setRecentDocs] = React.useState<any[]>([]);
    const [activeProcs, setActiveProcs] = React.useState<any[]>([]);
    const [chartData, setChartData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const load = async () => {
            if (!userData?.empresaId) return;
            setLoading(true);

            try {
                // Get company info
                const { data: emp } = await supabase.from("empresas").select("*").eq("id", userData.empresaId).single();
                if (emp) setEmpresa(emp);

                // Get counts & Recent Docs
                const [licRes, certRes, msgRes, sigRes, docRes, procRes, billingRes] = await Promise.all([
                    supabase.from("licencas").select("*", { count: 'exact', head: true }).eq("empresa_id", userData.empresaId),
                    supabase.from("certidoes").select("*", { count: 'exact', head: true }).eq("empresa_id", userData.empresaId),
                    supabase.from("internal_messages" as any).select("*", { count: 'exact', head: true }).eq("empresa_id", userData.empresaId).eq("lida", false).eq("direcao", "escritorio_para_cliente"),
                    supabase.from("documentos_assinaturas").select("*", { count: 'exact', head: true }).eq("empresa_id", userData.empresaId).eq("status", "pendente"),
                    supabase.from("documentos").select("*").eq("empresa_id", userData.empresaId).order("created_at", { ascending: false }).limit(4),
                    supabase.from("processos_societarios").select("*").eq("empresa_id", userData.empresaId).neq("status", "concluido").order("created_at", { ascending: false }).limit(2),
                    supabase.from("honorarios_mensal").select("competencia, valor_total").eq("empresa_id", userData.empresaId).order("competencia", { ascending: true }).limit(12)
                ]);

                setCounts({
                    lics: licRes.count || 0,
                    certs: certRes.count || 0,
                    msgs: msgRes.count || 0,
                    pendingSigs: sigRes.count || 0
                });

                if (docRes.data) setRecentDocs(docRes.data);
                if (procRes.data) setActiveProcs(procRes.data);

                // Process Chart Data
                if (billingRes.data && billingRes.data.length > 0) {
                    const formatted = billingRes.data.map(d => ({
                        name: d.competencia,
                        faturamento: d.valor_total || 0,
                        // Simulate tax estimate (e.g. 15%) for visualization if real tax data isn't joined yet
                        impostos: (d.valor_total || 0) * 0.12 
                    }));
                    setChartData(formatted);
                } else {
                    // Fallback for empty data
                    setChartData([
                        { name: "Sem Dados", faturamento: 0, impostos: 0 }
                    ]);
                }

            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userData]);

    const stats = [
        { label: "Assinaturas Pendentes", value: counts.pendingSigs.toString(), icon: PenTool, color: "text-rose-500", bg: "bg-rose-500/10" },
        { label: "Licenças Ativas", value: counts.lics.toString(), icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Certidões", value: counts.certs.toString(), icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Sincronizando dados da sua empresa...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header / Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent italic">
                        Olá, {userData?.nome?.split(' ')[0]}!
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        Veja o que aconteceu com a <span className="text-foreground font-bold">{empresa?.nome_empresa}</span> recentemente.
                    </p>
                </div>
                
                <div className="hidden lg:flex items-center gap-4 bg-card/40 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-sm transition-all hover:border-primary/30 group">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">CNPJ</p>
                        <p className="font-bold text-card-foreground tabular-nums">
                            {empresa?.cnpj || "---"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="module-card group cursor-default">
                        <div className="flex flex-row items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                {stat.label}
                            </span>
                            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} group-hover:rotate-12 transition-all shadow-sm`}>
                                <stat.icon size={18} />
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black tabular-nums">{stat.value}</span>
                            <span className="text-xs text-muted-foreground font-bold mb-1.5 italic">items</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chart Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 module-card !p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                        <div>
                            <h3 className="text-xl font-black flex items-center gap-2 italic">
                                <TrendingUp className="text-primary" size={22} /> Desempenho Mensal
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 font-bold uppercase tracking-wider">Histórico de Honorários & Faturamento</p>
                        </div>
                        <div className="flex items-center gap-6 px-4 py-2 bg-muted/30 rounded-xl border border-border/40">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">Valor Total</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">Impostos (Est.)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,120,120,0.05)" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }} 
                                    dy={15}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 800, fill: "hsl(var(--muted-foreground))" }}
                                    tickFormatter={(value) => `R$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                                />
                                <Tooltip 
                                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    contentStyle={{ 
                                        backgroundColor: "hsl(var(--card))", 
                                        borderRadius: "16px", 
                                        border: "1px solid hsl(var(--border))",
                                        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                                        padding: '12px'
                                    }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                                    labelStyle={{ fontSize: '10px', fontWeight: 900, marginBottom: '8px', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}
                                    formatter={(value: number) => [
                                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                                        ""
                                    ]}
                                />
                                <Area type="monotone" dataKey="faturamento" stroke="none" fillOpacity={1} fill="url(#colorFat)" />
                                <Bar 
                                    dataKey="faturamento" 
                                    fill="hsl(var(--primary))" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={24}
                                    opacity={0.8}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="impostos" 
                                    stroke="#f59e0b" 
                                    strokeWidth={3} 
                                    dot={{ fill: "#f59e0b", r: 3, strokeWidth: 0 }} 
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="module-card">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black flex items-center gap-2 italic">
                            <PenTool className="text-rose-500" size={20} /> Assinaturas
                        </h3>
                        {counts.pendingSigs > 0 && (
                            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        <div className="p-6 rounded-2xl bg-muted/30 border border-dashed border-border/60 flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                <PenTool size={28} />
                            </div>
                            <div>
                                <p className="font-black text-foreground italic">
                                    {counts.pendingSigs === 0 
                                      ? "Tudo assinado!" 
                                      : `${counts.pendingSigs} assinaturas pendentes`}
                                </p>
                                <p className="text-muted-foreground text-xs font-medium mt-1">
                                    {counts.pendingSigs === 0 
                                      ? "Não encontramos documentos aguardando sua assinatura." 
                                      : "Existem documentos que precisam da sua validação digital."}
                                </p>
                            </div>
                            <Button className="w-full rounded-xl font-bold gap-2 shadow-lg shadow-rose-500/20" variant={counts.pendingSigs > 0 ? "default" : "outline"}>
                                Ir para Assinaturas <ArrowRight size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Documentos Recentes */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black flex items-center gap-2 italic">
                            <FileText className="text-primary" size={22} /> Documentos Recentes
                        </h3>
                        <Button variant="ghost" size="sm" className="text-primary font-black text-xs uppercase tracking-widest hover:bg-transparent">Ver Todos</Button>
                    </div>
                    <div className="module-card !p-0 overflow-hidden divide-y divide-border/50">
                        {recentDocs.length === 0 && <div className="p-12 text-center text-muted-foreground font-medium italic">Nenhum documento disponível no momento.</div>}
                        {recentDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-5 hover:bg-muted/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-card-foreground max-w-[220px] truncate leading-tight group-hover:text-primary transition-colors italic">{doc.titulo || doc.nome_arquivo}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60">{doc.categoria}</span>
                                            <span className="text-[10px] text-muted-foreground/40">•</span>
                                            <span className="text-[10px] font-bold text-muted-foreground/60">{format(new Date(doc.created_at), 'dd MMM yyyy', { locale: ptBR })}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={() => window.open(doc.arquivo_url || doc.url, '_blank')} variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                                    <Download size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Status de Processos Automados */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black flex items-center gap-2 italic">
                            <Clock className="text-primary" size={22} /> Processos em Andamento
                        </h3>
                        <Button variant="ghost" size="sm" className="text-primary font-black text-xs uppercase tracking-widest hover:bg-transparent">Ver Detalhes</Button>
                    </div>
                    <div className="module-card">
                        {activeProcs.length === 0 ? (
                           <div className="p-8 text-center text-muted-foreground font-medium italic">Sua empresa está em dia! Nenhum processo societário ativo.</div>
                        ) : (
                        <div className="relative pl-8 space-y-8">
                            <div className="absolute left-[15px] top-2 bottom-2 w-[1.5px] bg-border/60" />
                            {activeProcs.map(proc => (
                            <div key={proc.id} className="relative group">
                                <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background z-10 shadow-[0_0_8px_hsl(var(--primary))]" />
                                <div className="bg-muted/20 p-4 rounded-xl border border-transparent group-hover:border-primary/20 transition-all hover:bg-muted/40">
                                    <div className="flex items-center justify-between">
                                        <p className="font-black text-foreground capitalize italic leading-none">{proc.tipo?.replace(/_/g, ' ')}</p>
                                        <span className="text-[9px] font-black px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md uppercase tracking-wider animate-pulse ml-2 shrink-0">
                                            {proc.status?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span className="font-bold uppercase tracking-widest opacity-60">Fase Atual</span>
                                        <span className="font-bold opacity-80 italic">{format(new Date(proc.created_at), 'dd/MM/yyyy')}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[65%] rounded-full opacity-60" />
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Premium Help Banner */}
            <section className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="module-card border-primary/20 relative z-10 !p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <MessageSquare size={240} className="text-primary" />
                    </div>
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                            <MessageSquare size={12} /> Suporte Exclusivo
                        </div>
                        <h3 className="text-3xl font-black italic tracking-tight text-foreground leading-[1.1]">
                            Precisa de algo mais para a <br className="hidden md:block"/> sua empresa hoje?
                        </h3>
                        <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-lg">
                            Nossa equipe técnica está pronta para resolver qualquer dúvida sobre fiscal, departamento pessoal ou processos. Estamos a um clique de distância.
                        </p>
                    </div>
                    <Button className="h-16 px-10 rounded-2xl text-lg font-black italic gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.03] active:scale-[0.98] transition-all bg-primary">
                        Abrir Chamado <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </section>
        </div>
    );
};

export default PortalDashboardPage;
