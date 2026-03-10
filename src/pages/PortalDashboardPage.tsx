import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    Building2, FileText, CheckCircle, AlertCircle,
    ArrowRight, Download, MessageSquare
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PortalDashboardPage: React.FC = () => {
    const { userData } = useAuth();

    const stats = [
        { label: "Documentos Pendentes", value: "3", icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Processos em Andamento", value: "1", icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
        { label: "Mensagens Não Lidas", value: "0", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
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
                        <p className="font-bold text-card-foreground">Audipreve Contabilidade</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.label} className="border-none shadow-md overflow-hidden group hover:shadow-lg transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-tight">
                                {stat.label}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
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
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Folha de Pagamento - 02/2026</p>
                                        <p className="text-xs text-muted-foreground">Disponibilizado em 05/03/2026</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                                    <Download size={14} />
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
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                        <div className="relative pl-8 space-y-8">
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-muted" />

                            <div className="relative">
                                <div className="absolute -left-[24px] top-0 w-4 h-4 rounded-full bg-green-500 ring-4 ring-background" />
                                <div>
                                    <p className="font-bold text-sm">Abertura de Empresa</p>
                                    <p className="text-xs text-muted-foreground">Etapa: Arquivamento na Junta</p>
                                    <div className="mt-2 text-[10px] font-bold px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full inline-block uppercase">
                                        Concluído
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute -left-[24px] top-0 w-4 h-4 rounded-full bg-primary ring-4 ring-background animate-pulse" />
                                <div>
                                    <p className="font-bold text-sm">Alteração Contratual</p>
                                    <p className="text-xs text-muted-foreground">Etapa: Coleta de Assinaturas</p>
                                    <div className="mt-2 text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full inline-block uppercase animate-pulse">
                                        Em Andamento
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Informativos/Mensagens */}
            <section className="bg-primary/5 border border-primary/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute -right-10 -bottom-10 opacity-10">
                    <MessageSquare size={200} className="text-primary" />
                </div>
                <div className="space-y-2 relative z-10 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-primary">Precisa de ajuda ou suporte?</h3>
                    <p className="text-muted-foreground text-lg">Envie uma mensagem direta para o nosso time de consultores.</p>
                </div>
                <Button className="px-8 py-6 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 relative z-10" size="lg">
                    Enviar Mensagem <ArrowRight size={20} className="ml-2" />
                </Button>
            </section>
        </div>
    );
};

export default PortalDashboardPage;
