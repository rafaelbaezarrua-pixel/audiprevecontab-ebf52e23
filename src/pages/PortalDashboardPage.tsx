import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    Building2, FileText, CheckCircle, AlertCircle,
    ArrowRight, Download, MessageSquare, Clock, Search
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PortalDashboardPage: React.FC = () => {
    const { userData } = useAuth();
    const [empresa, setEmpresa] = React.useState<any>(null);
    const [counts, setCounts] = React.useState({ lics: 0, certs: 0, msgs: 0 });

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
        };
        load();
    }, [userData]);

    const stats = [
        { label: "Licenças Ativas", value: counts.lics.toString(), icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Certidões Disponíveis", value: counts.certs.toString(), icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
        { label: "Mensagens Não Lidas", value: counts.msgs.toString(), icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
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
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-5 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-base text-card-foreground">Folha de Pagamento - 02/2026</p>
                                        <p className="text-sm text-muted-foreground">Disponibilizado em 05/03/2026</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all">
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
                        <div className="relative pl-10 space-y-10">
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-muted/50" />
                            
                            <div className="relative group">
                                <div className="absolute -left-[29px] top-0 w-5 h-5 rounded-full bg-success ring-4 ring-background z-10 shadow-sm" />
                                <div className="bg-muted/20 p-4 rounded-2xl border border-transparent group-hover:border-success/20 transition-all">
                                    <p className="font-bold text-base text-card-foreground">Abertura de Empresa</p>
                                    <p className="text-sm text-muted-foreground mt-1">Etapa: Arquivamento na Junta</p>
                                    <div className="mt-3 text-[10px] font-black px-3 py-1 bg-success/10 text-success rounded-full inline-block uppercase tracking-wider">
                                        Concluído
                                    </div>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute -left-[29px] top-0 w-5 h-5 rounded-full bg-primary ring-4 ring-background animate-pulse z-10 shadow-sm shadow-primary/30" />
                                <div className="bg-muted/20 p-4 rounded-2xl border border-transparent group-hover:border-primary/20 transition-all">
                                    <p className="font-bold text-base text-card-foreground">Alteração Contratual</p>
                                    <p className="text-sm text-muted-foreground mt-1">Etapa: Coleta de Assinaturas</p>
                                    <div className="mt-3 text-[10px] font-black px-3 py-1 bg-primary/10 text-primary rounded-full inline-block uppercase tracking-wider animate-pulse">
                                        Em Andamento
                                    </div>
                                </div>
                            </div>
                        </div>
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
