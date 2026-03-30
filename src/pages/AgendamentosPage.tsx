import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, Clock, User, Plus, Save, X, ClipboardList, CheckCircle, Circle, RefreshCw, Trash2, LayoutDashboard, List, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useAgendamentos, Agendamento } from "@/hooks/useAgendamentos";

const AgendamentosPage: React.FC = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    
    const [search, setSearch] = useState("");
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
    const [activeTab, setActiveTab] = useState<"geral" | "meus">("geral");
    const [activeSubTab, setActiveSubTab] = useState<"em_aberto" | "concluido" | "pendente" | "arquivados">("em_aberto");
    const [viewMode, setViewMode] = useState<"list">("list");

    const { agendamentos, isLoading, isFetching, updateStatus, updateArquivado, deleteAgendamento } = useAgendamentos(competencia);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await updateStatus.mutateAsync({ id, status: newStatus });
            toast.success("Status atualizado!");
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        }
    };

    const handleUpdateArquivado = async (id: string, arquivado: boolean) => {
        try {
            await updateArquivado.mutateAsync({ id, arquivado });
            toast.success(arquivado ? "Arquivado!" : "Desarquivado!");
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        }
    };

    const handleDeleteAgendamento = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir?")) return;
        try {
            await deleteAgendamento.mutateAsync(id);
            toast.success("Excluído com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message);
        }
    };

    const filtered = agendamentos.filter(a => {
        const matchSearch = a.assunto.toLowerCase().includes(search.toLowerCase()) ||
            a.usuario_nome?.toLowerCase().includes(search.toLowerCase());

        if (activeSubTab === "arquivados") {
            if (!a.arquivado) return false;
        } else {
            if (a.arquivado) return false;
        }

        const isMine = a.usuario_id === user?.id;

        if (activeTab === "geral") {
            return matchSearch && (activeSubTab === "arquivados" ? true : (activeSubTab === "em_aberto" ? true : a.status === activeSubTab));
        } else {
            return matchSearch && isMine && (activeSubTab === "arquivados" ? true : (activeSubTab === "em_aberto" ? a.status === "em_aberto" : a.status === activeSubTab));
        }
    });

    const renderItemContent = (a: Agendamento) => (
        <div className={`p-4 rounded-xl border border-border bg-card group relative transition-all hover:shadow-md ${a.status === 'concluido' ? 'opacity-90' : ''}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-card-foreground leading-tight">{a.assunto}</h3>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => navigate(`/agendamentos/editar/${a.id}`)} className="p-1.5 rounded-md text-primary/70 hover:bg-primary/10 hover:text-primary"><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteAgendamento(a.id)} className="p-1.5 rounded-md text-destructive/70 hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><User size={12} className="text-primary" /> <span>{a.usuario_nome}</span></div>
                        <div className="flex items-center gap-1.5"><Calendar size={12} className="text-primary" /> <span>{format(new Date(a.data + 'T00:00:00'), "dd/MM/yyyy")}</span></div>
                        <div className="flex items-center gap-1.5"><Clock size={12} className="text-primary" /> <span>{a.horario.slice(0, 5)}</span></div>
                    </div>

                    {a.informacoes_adicionais && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg italic line-clamp-2">{a.informacoes_adicionais}</p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full text-center ${
                        a.status === 'concluido' ? 'bg-green-500/10 text-green-500' : 
                        a.status === 'pendente' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                    }`}>
                        {a.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {(a.usuario_id === user?.id || userData?.isAdmin) && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    {!a.arquivado && (
                        a.status !== 'concluido' ? (
                            <button onClick={() => handleUpdateStatus(a.id, 'concluido')} className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-bold hover:bg-green-500 hover:text-white transition-all">
                                <CheckCircle size={14} /> Concluir
                            </button>
                        ) : (
                            <button onClick={() => handleUpdateStatus(a.id, 'em_aberto')} className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-muted-foreground hover:text-white transition-all">
                                <Circle size={14} /> Reabrir
                            </button>
                        )
                    )}
                    
                    {!a.arquivado ? (
                        <button onClick={() => handleUpdateArquivado(a.id, true)} className="flex-1 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-[11px] font-bold hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2">
                            <X size={13} /> Arquivar
                        </button>
                    ) : (
                        <button onClick={() => handleUpdateArquivado(a.id, false)} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary hover:text-white transition-all">
                            <RefreshCw size={13} /> Desarquivar
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando agendamentos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 flex flex-col min-h-[calc(100vh-100px)] animate-fade-in">
            <div className="flex items-center gap-3 justify-end shrink-0">
                {isFetching && !isLoading && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-tight">Sincronizando...</span>
                    </div>
                )}
                <input
                    type="month"
                    value={competencia}
                    onChange={e => setCompetencia(e.target.value)}
                    className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold"
                />
                <button onClick={() => navigate("/agendamentos/novo")} className="button-premium shadow-md">
                    <Plus size={18} /> Novo Agendamento
                </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex border-b border-border w-full sm:w-auto">
                    <button className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "geral" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("geral")}>Geral</button>
                    <button className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "meus" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("meus")}>Meus Agendamentos</button>
                </div>

                <div className="flex gap-1.5 p-1 bg-muted/30 rounded-lg">
                    {[
                        { id: "em_aberto", label: "Próximos", hideOnGeral: true },
                        { id: "concluido", label: "Concluídos", hideOnGeral: true },
                        { id: "pendente", label: "Atrasados", hideOnGeral: true },
                        { id: "arquivados", label: "Arquivados", hideOnGeral: false }
                    ].map(sub => {
                        if (activeTab === "geral" && sub.hideOnGeral && sub.id !== "em_aberto") return null;
                        const label = activeTab === "geral" && sub.id === "em_aberto" ? "Todos Ativos" : sub.label;
                        return (
                            <button key={sub.id} onClick={() => setActiveSubTab(sub.id as any)} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === sub.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="relative max-w-sm shrink-0">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Buscar agendamento..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                {filtered.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/50">
                        Nenhum agendamento encontrado para os filtros aplicados.
                    </div>
                ) : (
                    filtered.map(a => <React.Fragment key={a.id}>{renderItemContent(a)}</React.Fragment>)
                )}
            </div>
        </div>
    );
};

export default AgendamentosPage;
