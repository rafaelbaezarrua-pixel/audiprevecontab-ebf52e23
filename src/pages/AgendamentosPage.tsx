import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, Clock, User, Plus, Save, X, ClipboardList, CheckCircle, Circle, RefreshCw, Trash2, LayoutDashboard, List } from "lucide-react";
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
    const [viewMode, setViewMode] = useState<"list">("list");

    const loadData = async () => {
        setLoading(true);
        try {
            // Carregar usuários para mapear nomes
            const { data: usersData } = await (supabase.from("profiles").select("id, full_name, user_id") as any);
            const mappedUsers = (usersData || []).filter((u: any) => u.user_id).map((u: any) => ({
                id: u.user_id,
                nome: u.full_name || "Sem Nome"
            }));

            // Carregar agendamentos
            const { data: agendaData } = await (supabase
                .from("agendamentos" as any)
                .select("*")
                .eq("competencia", competencia)
                .order("horario", { ascending: true }) as any);

            const now = new Date();

            const enrichedData = (agendaData || []).map((a: any) => {
                let currentStatus = a.status || "em_aberto";
                let isOverdue = false;

                if (currentStatus === "em_aberto" && a.data && a.horario) {
                    const scheduledDateTime = new Date(`${a.data}T${a.horario}`);
                    if (scheduledDateTime < now) {
                        currentStatus = "pendente";
                        isOverdue = true;
                    }
                }

                return {
                    ...a,
                    status: currentStatus,
                    arquivado: !!a.arquivado,
                    usuario_nome: mappedUsers.find(u => u.id === a.usuario_id)?.nome || "Não encontrado",
                    _isOverdueDbUpdateNeeded: isOverdue // Flag to update DB later
                };
            });

            // Fire and forget DB updates for newly identified overdue appointments
            const overdueItems = enrichedData.filter(item => item._isOverdueDbUpdateNeeded);
            if (overdueItems.length > 0) {
                Promise.all(overdueItems.map(item =>
                    supabase.from("agendamentos" as any).update({ status: "pendente" } as any).eq("id", item.id) as any
                )).catch(e => console.error("Failed to auto-update overdue appointments", e));
            }

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

    // Background job to check for overdue items every minute
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            let hasChanges = false;

            setAgendamentos(prev => {
                const updated = prev.map(a => {
                    if (a.status === "em_aberto" && a.data && a.horario) {
                        const scheduledDateTime = new Date(`${a.data}T${a.horario}`);
                        if (scheduledDateTime < now) {
                            hasChanges = true;
                            // Optionally push the update to Supabase
                            supabase.from("agendamentos" as any).update({ status: "pendente" } as any).eq("id", a.id).then();
                            return { ...a, status: "pendente" as const };
                        }
                    }
                    return a;
                });
                return hasChanges ? updated : prev;
            });
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, []);

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

    const renderItemContent = (a: Agendamento) => (
        <div className={`
            p-4 space-y-3 h-full bg-card group relative
            border-l-4 ${a.status === 'concluido' ? 'border-l-green-500 opacity-90' : a.status === 'pendente' ? 'border-l-amber-500' : 'border-l-primary'}
        `}>
            <div className="flex items-start justify-between">
                <div className="space-y-1 w-full">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-card-foreground leading-tight text-sm flex-1">{a.assunto}</h3>
                        <button
                            onClick={() => handleDeleteAgendamento(a.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                            title="Excluir"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                        <User size={12} className="text-primary/70" /> Para: <span className="text-foreground font-medium">{a.usuario_nome}</span>
                    </p>
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
                <div className="bg-muted/40 p-2.5 rounded-lg text-xs tracking-tight text-foreground/80 border border-border italic line-clamp-3">
                    {a.informacoes_adicionais}
                </div>
            )}

            {(a.usuario_id === user?.id || userData?.isAdmin) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border mt-auto">
                    {!a.arquivado && (
                        <>
                            {a.status !== 'concluido' ? (
                                <button
                                    onClick={() => handleUpdateStatus(a.id, 'concluido')}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 text-green-500 text-xs font-bold hover:bg-green-500 hover:text-white transition-all"
                                >
                                    <CheckCircle size={14} /> Concluir
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleUpdateStatus(a.id, 'em_aberto')}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-bold hover:bg-muted-foreground hover:text-white transition-all"
                                >
                                    <Circle size={14} /> Reabrir
                                </button>
                            )}
                        </>
                    )}

                    {!a.arquivado ? (
                        <button
                            onClick={() => handleUpdateArquivado(a.id, true)}
                            className="flex-1 px-3 py-1.5 rounded-md bg-muted/50 text-muted-foreground text-[11px] font-bold hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-1.5"
                            title="Arquivar"
                        >
                            <X size={13} /> Arquivar
                        </button>
                    ) : (
                        <button
                            onClick={() => handleUpdateArquivado(a.id, false)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary hover:text-white transition-all"
                        >
                            <RefreshCw size={13} /> Desarquivar
                        </button>
                    )}

                    <button
                        onClick={() => handleDeleteAgendamento(a.id)}
                        className="px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-[11px] font-bold hover:bg-destructive hover:text-white transition-all flex items-center gap-1.5"
                        title="Excluir"
                    >
                        <Trash2 size={13} /> Excluir
                    </button>
                </div>
            )}
        </div>
    );

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

    const handleDeleteAgendamento = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.")) {
            return;
        }

        try {
            const { error } = await (supabase
                .from("agendamentos" as any)
                .delete()
                .eq("id", id) as any);

            if (error) throw error;
            toast.success("Agendamento excluído com sucesso!");
            loadData();
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message);
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
            if (activeSubTab === "arquivados") return matchSearch;
            return matchSearch && a.status === activeSubTab;
        } else {
            // "meus" agendamentos
            if (activeSubTab === "arquivados") return matchSearch && isMine;
            return matchSearch && isMine && a.status === activeSubTab;
        }
    });

    if (loading && agendamentos.length === 0) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
    }



    return (
        <div className="space-y-6 flex flex-col min-h-[calc(100vh-100px)]">
            <div className="flex items-center gap-3 justify-end shrink-0">
                <input
                    type="month"
                    value={competencia}
                    onChange={e => setCompetencia(e.target.value)}
                    className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold"
                />
                <button
                    onClick={() => navigate("/agendamentos/novo")}
                    className="button-premium shadow-md"
                >
                    <Plus size={18} /> Novo Agendamento
                </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex border-b border-border w-full sm:w-auto overflow-x-auto no-scrollbar">
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
                        { id: "em_aberto", label: "Em Aberto" },
                        { id: "concluido", label: "Concluído" },
                        { id: "pendente", label: "Pendente" },
                        { id: "arquivados", label: "Arquivados" }
                    ].map(sub => {
                        const isPendente = sub.id === "pendente";
                        const count = isPendente 
                            ? agendamentos.filter(a => !a.arquivado && a.status === "pendente" && (activeTab === "geral" || a.usuario_id === user?.id)).length 
                            : 0;

                        return (
                            <button
                                key={sub.id}
                                onClick={() => setActiveSubTab(sub.id as any)}
                                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${activeSubTab === sub.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                {sub.label}
                                {isPendente && count > 0 && (
                                    <span className="flex items-center justify-center bg-red-500 text-white text-[10px] min-w-[16px] h-[16px] px-1 rounded-full font-bold">
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>


            </div>

            <div className="relative max-w-sm shrink-0">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar agendamento ou usuário..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                {filtered.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                        Nenhum agendamento encontrado para este período.
                    </div>
                ) : (
                    filtered.map(a => <React.Fragment key={a.id}>{renderItemContent(a)}</React.Fragment>)
                )}
            </div>
        </div>
    );
};

export default AgendamentosPage;
