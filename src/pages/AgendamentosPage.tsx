import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, Clock, User, Plus, Save, X, ClipboardList, CheckCircle, Circle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Agendamento {
    id: string;
    data: string;
    horario: string;
    usuario_id: string;
    criado_por: string;
    assunto: string;
    informacoes_adicionais: string;
    competencia: string;
    usuario_nome?: string;
    status: "em_aberto" | "concluido" | "pendente";
    arquivado: boolean;
}

const AgendamentosPage: React.FC = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
    const [activeTab, setActiveTab] = useState<"geral" | "meus">("geral");
    const [activeSubTab, setActiveSubTab] = useState<"em_aberto" | "concluido" | "pendente" | "arquivados">("em_aberto");

    const loadData = async () => {
        setLoading(true);
        try {
            // Carregar usuários para mapear nomes
            const { data: usersData } = await (supabase.from("profiles").select("id, full_name, user_id") as any);
            const mappedUsers = (usersData || []).map((u: any) => ({
                id: u.user_id || u.id,
                nome: u.full_name || "Sem Nome"
            }));

            // Carregar agendamentos
            const { data: agendaData } = await (supabase
                .from("agendamentos" as any)
                .select("*")
                .eq("competencia", competencia)
                .order("horario", { ascending: true }) as any);

            const enrichedData = (agendaData || []).map((a: any) => ({
                ...a,
                status: a.status || "em_aberto",
                arquivado: !!a.arquivado,
                usuario_nome: mappedUsers.find(u => u.id === a.usuario_id)?.nome || "Não encontrado"
            }));

            setAgendamentos(enrichedData);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [competencia]);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await (supabase
                .from("agendamentos" as any)
                .update({ status: newStatus } as any)
                .eq("id", id) as any);

            if (error) throw error;
            toast.success("Status atualizado!");
            loadData();
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        }
    };

    const handleUpdateArquivado = async (id: string, arquivado: boolean) => {
        try {
            const { error } = await (supabase
                .from("agendamentos" as any)
                .update({ arquivado } as any)
                .eq("id", id) as any);

            if (error) throw error;
            toast.success(arquivado ? "Agendamento arquivado!" : "Agendamento desarquivado!");
            loadData();
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        }
    };

    const filtered = agendamentos.filter(a => {
        const matchSearch = a.assunto.toLowerCase().includes(search.toLowerCase()) ||
            a.usuario_nome?.toLowerCase().includes(search.toLowerCase());

        // Filtragem por Arquivados
        if (activeSubTab === "arquivados") {
            if (!a.arquivado) return false;
        } else {
            if (a.arquivado) return false;
        }

        const isMine = a.usuario_id === user?.id;

        if (activeTab === "geral") {
            // No modo Geral, se estiver na sub-aba arquivados, mostra todos os arquivados
            if (activeSubTab === "arquivados") return matchSearch;
            // Caso contrário, mostra tudo que não está arquivado (filtro padrão do Geral)
            return matchSearch;
        } else {
            // "meus" agendamentos
            const matchUser = isMine;
            if (activeSubTab === "arquivados") {
                return matchSearch && matchUser;
            }
            return matchSearch && matchUser && a.status === activeSubTab;
        }
    });

    if (loading && agendamentos.length === 0) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "concluido":
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 uppercase">Concluído</span>;
            case "pendente":
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">Pendente</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase">Em Aberto</span>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 justify-end">
                <input
                    type="month"
                    value={competencia}
                    onChange={e => setCompetencia(e.target.value)}
                    className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold"
                />
                <button
                    onClick={() => navigate("/agendamentos/novo")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shadow-md transition-all hover:scale-105"
                    style={{ background: "var(--gradient-primary)" }}
                >
                    <Plus size={18} /> Novo Agendamento
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex border-b border-border">
                    <button
                        className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "geral" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        onClick={() => {
                            setActiveTab("geral");
                            if (activeSubTab !== "arquivados") setActiveSubTab("em_aberto");
                        }}
                    >
                        Geral
                    </button>
                    <button
                        className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "meus" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        onClick={() => {
                            setActiveTab("meus");
                            if (activeSubTab !== "arquivados") setActiveSubTab("em_aberto");
                        }}
                    >
                        Meus Agendamentos
                    </button>
                </div>

                <div className="flex gap-2 p-1 bg-muted/30 rounded-lg w-fit">
                    {[
                        { id: "em_aberto", label: "Em Aberto", hideOnGeral: true },
                        { id: "concluido", label: "Concluído", hideOnGeral: true },
                        { id: "pendente", label: "Pendente", hideOnGeral: true },
                        { id: "arquivados", label: "Arquivados", hideOnGeral: false }
                    ].map(sub => {
                        // Na aba Geral, as sub-abas de status não fazem sentido se o Geral já mostra tudo,
                        // mas vamos manter a de Arquivados. Se o usuário quiser filtrar Geral por status, 
                        // poderíamos implementar, mas o pedido foca em "arquivados".
                        // Para simplificar e atender o pedido: Geral tem "Todos" (em_aberto) e "Arquivados".
                        if (activeTab === "geral" && sub.hideOnGeral && sub.id !== "em_aberto") return null;

                        const label = activeTab === "geral" && sub.id === "em_aberto" ? "Ativos" : sub.label;

                        return (
                            <button
                                key={sub.id}
                                onClick={() => setActiveSubTab(sub.id as any)}
                                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === sub.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar agendamento ou usuário..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                        Nenhum agendamento encontrado para este período.
                    </div>
                ) : (
                    filtered.map(a => (
                        <div key={a.id} className={`module-card p-5 space-y-4 hover:shadow-lg transition-all border-l-4 ${a.status === 'concluido' ? 'border-l-green-500 opacity-80' : 'border-l-primary'}`}>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-card-foreground leading-tight">{a.assunto}</h3>
                                        {getStatusBadge(a.status)}
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <User size={12} /> Para: <span className="text-foreground font-medium">{a.usuario_nome}</span>
                                    </p>
                                </div>
                                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                    <Calendar size={18} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar size={14} className="text-primary" />
                                    {format(new Date(a.data + 'T00:00:00'), "dd 'de' MMM", { locale: ptBR })}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock size={14} className="text-primary" />
                                    {a.horario.slice(0, 5)}
                                </div>
                            </div>

                            {a.informacoes_adicionais && (
                                <div className="bg-muted/30 p-3 rounded-lg text-xs text-muted-foreground border border-border italic">
                                    {a.informacoes_adicionais}
                                </div>
                            )}

                            {a.usuario_id === user?.id && (
                                <div className="flex items-center gap-2 pt-2 border-t border-border">
                                    {!a.arquivado ? (
                                        <>
                                            {a.status !== 'concluido' ? (
                                                <button
                                                    onClick={() => handleUpdateStatus(a.id, 'concluido')}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 text-xs font-bold hover:bg-green-500 hover:text-white transition-all"
                                                >
                                                    <CheckCircle size={14} /> Concluir
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUpdateStatus(a.id, 'em_aberto')}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-muted-foreground hover:text-white transition-all"
                                                >
                                                    <Circle size={14} /> Reabrir
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleUpdateArquivado(a.id, true)}
                                                className="px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-destructive hover:text-white transition-all flex items-center gap-1.5"
                                                title="Arquivar"
                                            >
                                                <X size={14} /> Arquivar
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleUpdateArquivado(a.id, false)}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all"
                                        >
                                            <RefreshCw size={14} /> Desarquivar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AgendamentosPage;
