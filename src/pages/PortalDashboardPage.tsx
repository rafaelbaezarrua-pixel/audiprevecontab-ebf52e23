import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    Building2, FileText, CheckCircle, AlertCircle,
    ArrowRight, Download, MessageSquare, Clock, Search
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
} from "recharts";

const PortalDashboardPage: React.FC = () => {
    const { userData } = useAuth();
    const [empresa, setEmpresa] = React.useState<any>(null);
    const [counts, setCounts] = React.useState({ lics: 0, certs: 0, msgs: 0 });
    const [recentDocs, setRecentDocs] = React.useState<any[]>([]);
    const [activeProcs, setActiveProcs] = React.useState<any[]>([]);

    React.useEffect(() => {
        const load = async () => {
            if (!userData?.empresaId) return;

            // Get company name
            const { data: emp } = await supabase.from("empresas").select("nome_empresa").eq("id", userData.empresaId).single();
            if (emp) setEmpresa(emp);

            // Get counts
            const { count: licCount } = await supabase.from("licencas").select("*", { count: 'exact', head: true }).eq("empresa_id", userData.empresaId);
            const { count: certCount } = await supabase.from("certidoes").select("*", { count: 'exact', head: true }).eq("empresa_id", userData.empresaId);
            const { count: msgCount } = await supabase.from("internal_messages" as any).select("*", { count: 'exact', head: true }).eq("empresa_id", userData.empresaId).eq("lida", false).eq("direcao", "escritorio_para_cliente");

            setCounts({
                lics: licCount || 0,
                certs: certCount || 0,
                msgs: msgCount || 0
            });

            // Get recent docs
            const { data: docs } = await supabase.from("documentos")
               .select("*").eq("empresa_id", userData.empresaId)
               .order("created_at", { ascending: false }).limit(3);
            if (docs) setRecentDocs(docs);

            // Get active processes
            const { data: procs } = await supabase.from("processos_societarios")
               .select("*").eq("empresa_id", userData.empresaId)
               .neq("status", "concluido")
               .order("created_at", { ascending: false }).limit(2);
            if (procs) setActiveProcs(procs);
        };
        load();
    }, [userData]);

    const stats = [
        { label: "Licenças Ativas", value: counts.lics.toString(), icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Certidões Disponíveis", value: counts.certs.toString(), icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
        { label: "Mensagens Não Lidas", value: counts.msgs.toString(), icon: MessageSquare, color: "text-primary", bg: "bg-primary/10" },
    ];

    const chartData = [
        { name: "Set", faturamento: 45000, impostos: 4100 },
        { name: "Out", faturamento: 52000, impostos: 4800 },
        { name: "Nov", faturamento: 48000, impostos: 4400 },
        { name: "Dez", faturamento: 61000, impostos: 5600 },
        { name: "Jan", faturamento: 55000, impostos: 5100 },
        { name: "Fev", faturamento: 58000, impostos: 5300 },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bem-vindo, {userData?.nome}!</h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Acompanhe a situação da sua empresa em tempo real.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sua Empresa</p>
                        <p className="font-bold text-card-foreground truncate max-w-[200px]">
                            {empresa?.nome_empresa || "Carregando..."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="card-premium group">
                        <div className="flex flex-row items-center justify-between mb-4">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                {stat.label}
                            </span>
                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <div className="text-4xl font-black text-card-foreground">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Dashboard Financeiro */}
            <div className="card-premium animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Building2 className="text-primary" size={22} /> Faturamento vs Impostos
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 font-medium">Histórico dos últimos 6 meses</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Faturamento</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Impostos</span>
                        </div>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(value) => `R$ ${value / 1000}k`}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: "hsl(var(--card))", 
                                    borderRadius: "16px", 
                                    border: "1px solid hsl(var(--border))",
                                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                                    fontWeight: 700
                                }}
                                formatter={(value: number) => [
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                                    ""
                                ]}
                            />
                            <Bar 
                                dataKey="faturamento" 
                                fill="hsl(var(--primary))" 
                                radius={[6, 6, 0, 0]} 
                                barSize={40}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="impostos" 
                                stroke="#f59e0b" 
                                strokeWidth={3} 
                                dot={{ fill: "#f59e0b", r: 4, strokeWidth: 2 }} 
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Documentos Recentes */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="text-primary" size={22} /> Documentos Recentes
                        </h3>
                        <Button variant="ghost" size="sm" className="text-primary font-bold">Ver Todos</Button>
                    </div>
                    <div className="card-premium !p-0 overflow-hidden">
                        {recentDocs.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum documento recente</div>}
                        {recentDocs.map((doc, i) => (
                            <div key={doc.id} className="flex items-center justify-between p-5 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-base text-card-foreground max-w-[200px] truncate">{doc.titulo || doc.nome_arquivo}</p>
                                        <p className="text-sm text-muted-foreground">{doc.categoria}</p>
                                    </div>
                                </div>
                                <Button onClick={() => window.open(doc.arquivo_url || doc.url, '_blank')} variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all">
                                    <Download size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Status de Processos */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="text-primary" size={22} /> Status de Processos
                        </h3>
                        <Button variant="ghost" size="sm" className="text-primary font-bold">Ver Todos</Button>
                    </div>
                    <div className="card-premium">
                        {activeProcs.length === 0 ? (
                           <div className="p-4 text-center text-muted-foreground">Nenhum processo ativo no momento.</div>
                        ) : (
                        <div className="relative pl-10 space-y-10">
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-muted/50" />
                            {activeProcs.map(proc => (
                            <div key={proc.id} className="relative group">
                                <div className="absolute -left-[29px] top-0 w-5 h-5 rounded-full bg-primary ring-4 ring-background animate-pulse z-10 shadow-sm shadow-primary/30" />
                                <div className="bg-muted/20 p-4 rounded-2xl border border-transparent group-hover:border-primary/20 transition-all">
                                    <p className="font-bold text-base text-card-foreground capitalize">{proc.tipo?.replace(/_/g, ' ')}</p>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">Status: {proc.status?.replace(/_/g, ' ')}</p>
                                    <div className="mt-3 text-[10px] font-black px-3 py-1 bg-primary/10 text-primary rounded-full inline-block uppercase tracking-wider animate-pulse">
                                        Em Andamento
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Informativos/Mensagens */}
            <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-[2rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative shadow-inner">
                <div className="absolute -right-16 -bottom-16 opacity-[0.05] pointer-events-none">
                    <MessageSquare size={320} className="text-primary" />
                </div>
                <div className="space-y-4 relative z-10 text-center md:text-left max-w-xl">
                    <h3 className="text-3xl font-black text-primary leading-tight">Precisa de suporte agora?</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">Nossa equipe está pronta para te atender. Envie uma mensagem e responderemos o mais breve possível.</p>
                </div>
                <button className="button-premium px-10 py-5 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 relative z-10 flex items-center gap-3">
                    Enviar Mensagem <ArrowRight size={22} />
                </button>
            </section>
        </div>
    );
};

export default PortalDashboardPage;
