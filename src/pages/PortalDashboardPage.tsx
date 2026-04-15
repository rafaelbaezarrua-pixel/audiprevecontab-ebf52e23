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
        <div className="space-y-8 animate-fade-in pb-20 relative px-1">
            {/* Header / Welcome */}
            <div className="glass-header sticky top-0 z-10 -mx-4 -mt-4 px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/10">
                        <LayoutDashboard size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic px-0">
                            Olá, {userData?.nome?.split(' ')[0]}!
                        </h1>
                        <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mt-0.5">
                            Status da <span className="text-foreground">{empresa?.nome_empresa}</span>
                        </p>
                    </div>
                </div>
                
                <div className="hidden lg:flex items-center gap-4 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-border/20">
                    <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-1 text-right">CNPJ do Cliente</p>
                        <p className="font-bold text-foreground tabular-nums tracking-wider">
                            {empresa?.cnpj || "---"}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                        <Building2 size={20} />
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="glass-card group p-6 border-border/40">
                        <div className="flex flex-row items-center justify-between mb-5">
                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">
                                {stat.label}
                            </span>
                            <div className={`p-2 rounded-xl bg-black/5 dark:bg-white/5 ${stat.color} transition-all`}>
                                <stat.icon size={18} />
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black tabular-nums tracking-tighter text-foreground">{stat.value}</span>
                            <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest mb-2">Resumos</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 glass-card !p-8 border-border/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                        <div>
                            <h3 className="text-lg font-black flex items-center gap-2 italic text-foreground px-0 uppercase tracking-tight">
                                <TrendingUp className="text-primary" size={20} /> Desempenho Financeiro
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-[0.25em] opacity-40">Histórico de Honorários e Faturamento</p>
                        </div>
                        <div className="flex items-center gap-6 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl border border-border/10">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest text-primary">Total</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Aprox.</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,120,120,0.1)" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 9, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }} 
                                    dy={15}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 9, fontWeight: 800, fill: "hsl(var(--muted-foreground))" }}
                                    tickFormatter={(value) => `R$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                                />
                                <Tooltip 
                                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    contentStyle={{ 
                                        backgroundColor: "var(--glass-bg)", 
                                        backdropFilter: "blur(12px)",
                                        borderRadius: "16px", 
                                        border: "1px solid var(--glass-border)",
                                        boxShadow: "none",
                                        padding: '12px'
                                    }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 900 }}
                                    labelStyle={{ fontSize: '9px', fontWeight: 900, marginBottom: '8px', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                    formatter={(value: number) => [
                                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                                        ""
                                    ]}
                                />
                                <Bar 
                                    dataKey="faturamento" 
                                    fill="hsl(var(--primary))" 
                                    radius={[6, 6, 0, 0]} 
                                    barSize={28}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="impostos" 
                                    stroke="hsl(var(--muted-foreground))" 
                                    strokeWidth={2} 
                                    strokeDasharray="4 4"
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-8 border-border/40 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black flex items-center gap-2 italic uppercase tracking-tight text-foreground">
                            <PenTool className="text-primary/70" size={20} /> Validações
                        </h3>
                        {counts.pendingSigs > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-black uppercase tracking-tighter">Pendente</span>
                        )}
                    </div>
                    
                    <div className="space-y-6 flex-1 flex flex-col justify-center">
                        <div className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-border/20 flex flex-col items-center text-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                                <PenTool size={32} />
                            </div>
                            <div>
                                <p className="font-black text-foreground uppercase tracking-tight text-lg leading-tight">
                                    {counts.pendingSigs === 0 
                                      ? "Fluxo em dia!" 
                                      : `${counts.pendingSigs} Assinaturas`}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2 opacity-50">
                                    {counts.pendingSigs === 0 
                                      ? "Nenhum documento aguardando." 
                                      : "Necessário sua validação digital."}
                                </p>
                            </div>
                            <button className="button-premium w-full text-[10px] py-4">
                                Acessar documentos <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Documentos Recentes */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black flex items-center gap-2 italic uppercase tracking-tight text-foreground">
                            <FileText className="text-primary" size={20} /> Documentos Recentes
                        </h3>
                        <button className="text-[9px] font-black text-primary uppercase tracking-[0.25em] hover:opacity-70 transition-opacity">Ver Acervo</button>
                    </div>
                    <div className="glass-card !p-0 overflow-hidden divide-y divide-border/10 border-border/40 shadow-none">
                        {recentDocs.length === 0 && <div className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Nenhum documento disponível no momento.</div>}
                        {recentDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-5 hover:bg-black/5 dark:hover:bg-white/5 transition-all group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground max-w-[220px] truncate leading-tight group-hover:text-primary transition-colors italic">{doc.titulo || doc.nome_arquivo}</p>
                                        <div className="flex items-center gap-2 mt-1 px-0">
                                            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">{doc.categoria}</span>
                                            <span className="text-[9px] text-muted-foreground/20">•</span>
                                            <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{format(new Date(doc.created_at), 'dd MMM yyyy', { locale: ptBR })}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => window.open(doc.arquivo_url || doc.url, '_blank')} className="h-9 w-9 rounded-xl hover:bg-primary/20 hover:text-primary transition-all flex items-center justify-center text-muted-foreground/30">
                                    <Download size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Status de Processos Automados */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black flex items-center gap-2 italic uppercase tracking-tight text-foreground">
                            <Clock className="text-primary" size={20} /> Processos Ativos
                        </h3>
                        <button className="text-[9px] font-black text-primary uppercase tracking-[0.25em] hover:opacity-70 transition-opacity">Detalhes</button>
                    </div>
                    <div className="glass-card p-8 border-border/40 h-full">
                        {activeProcs.length === 0 ? (
                           <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Nenhum processo societário ativo no momento.</div>
                        ) : (
                        <div className="relative pl-8 space-y-8">
                            <div className="absolute left-[15px] top-2 bottom-2 w-[1.5px] bg-border/10" />
                            {activeProcs.map(proc => (
                            <div key={proc.id} className="relative group">
                                <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background z-10" />
                                <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-transparent group-hover:border-primary/20 transition-all hover:bg-black/10 dark:hover:bg-white/10">
                                    <div className="flex items-center justify-between">
                                        <p className="font-black text-foreground uppercase tracking-tight italic leading-none text-xs">{proc.tipo?.replace(/_/g, ' ')}</p>
                                        <span className="text-[9px] font-black px-2 py-0.5 bg-primary/20 text-primary rounded-md uppercase tracking-wider ml-2 shrink-0">
                                            {proc.status?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-[9px] text-muted-foreground">
                                        <span className="font-black uppercase tracking-[0.15em] opacity-40 italic">Fase em andamento</span>
                                        <span className="font-black opacity-40 italic uppercase">{format(new Date(proc.created_at), 'dd/MM/yyyy')}</span>
                                    </div>
                                    <div className="mt-3 h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
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

            {/* Support Help Banner */}
            <section className="relative overflow-hidden group mt-4">
                <div className="glass-card border-primary/20 relative z-10 !p-12 flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <MessageSquare size={240} className="text-primary" />
                    </div>
                    <div className="flex-1 space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-[0.25em]">
                            <MessageSquare size={13} /> Suporte Especializado
                        </div>
                        <h3 className="text-4xl font-black italic tracking-tighter text-foreground uppercase leading-[1.0]">
                            Soluções Ágeis para <br className="hidden md:block"/> seu negócio.
                        </h3>
                        <p className="text-muted-foreground text-base font-medium leading-relaxed max-w-lg">
                            Dúvidas fiscais, contábeis ou de folha de pagamento? Nossa equipe está disponível em tempo real para auxiliar no crescimento da sua empresa.
                        </p>
                    </div>
                    <button className="h-18 px-12 rounded-2xl text-base font-black italic gap-4 transition-all bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center">
                        Abrir chamado técnico <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </section>
        </div>
    );
};

export default PortalDashboardPage;
