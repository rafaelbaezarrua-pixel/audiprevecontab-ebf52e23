import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, Clock, User, Plus, Save, X, ClipboardList, CheckCircle, Circle, RefreshCw, Trash2, LayoutDashboard, List, Pencil, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { format, isAfter, parseISO } from "date-fns";
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
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Atualiza a cada minuto para mover itens de Próximos para Atrasados
        return () => clearInterval(timer);
    }, []);

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

    // Lista base de agendamentos não arquivados
    const baseList = agendamentos.filter(a => {
        const matchSearch = a.assunto.toLowerCase().includes(search.toLowerCase()) ||
            a.usuario_nome?.toLowerCase().includes(search.toLowerCase());
        const isMine = a.usuario_id === user?.id;
        const matchTab = activeTab === "geral" ? true : isMine;
        return matchSearch && matchTab;
    });

    // Função para determinar o status temporal
    const getTemporalStatus = (a: any) => {
        if (a.arquivado) return "arquivados";
        if (a.status === "concluido") return "concluido";
        
        try {
            const agDate = parseISO(`${a.data}T${a.horario}`);
            return isAfter(currentTime, agDate) ? "atrasados" : "proximos";
        } catch (e) {
            return "proximos";
        }
    };

    const filtered = baseList.filter(a => {
        const tStatus = getTemporalStatus(a);
        if (activeSubTab === "em_aberto") return tStatus === "proximos";
        if (activeSubTab === "pendente") return tStatus === "atrasados";
        return tStatus === activeSubTab;
    });

    const getCounts = () => {
        const c = { pro: 0, con: 0, atr: 0, arq: 0 };
        agendamentos.forEach(a => {
            const isMine = a.usuario_id === user?.id;
            const matchTab = activeTab === "geral" ? true : isMine;
            if (!matchTab) return;

            const tStatus = getTemporalStatus(a);
            if (tStatus === "proximos") c.pro++;
            else if (tStatus === "concluido") c.con++;
            else if (tStatus === "atrasados") c.atr++;
            else if (tStatus === "arquivados") c.arq++;
        });
        return c;
    };

    const tabCounts = getCounts();

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
                        <div className="flex items-center gap-1.5"><Calendar size={12} className="text-primary" /> <span>{formatDateBR(a.data)}</span></div>
                        <div className="flex items-center gap-1.5"><Clock size={12} className="text-primary" /> <span>{a.horario.slice(0, 5)}</span></div>
                    </div>

                    {a.informacoes_adicionais && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg line-clamp-2">{a.informacoes_adicionais}</p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-center flex items-center gap-1 ${
                        a.status === 'concluido' ? 'bg-green-500/10 text-green-500' : 
                        getTemporalStatus(a) === 'atrasados' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                    }`}>
                        {a.status === 'concluido' ? 'Concluído' : getTemporalStatus(a) === 'atrasados' ? <><AlertCircle size={10} /> Atrasado</> : 'Próximo'}
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
                            <button onClick={() => handleUpdateStatus(a.id, 'pendente')} className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-muted-foreground hover:text-white transition-all">
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
        <div className="space-y-6 animate-fade-in relative pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="header-title">Agendamentos</h1>
                        <FavoriteToggleButton moduleId="agendamentos" />
                        {isFetching && !isLoading && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 animate-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Sincronizando</span>
                            </div>
                        )}
                    </div>
                    <p className="subtitle-premium">Organização de visitas, reuniões e compromissos externos.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <input
                        type="month"
                        value={competencia}
                        onChange={e => setCompetencia(e.target.value)}
                        className="w-full sm:w-40 px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold transition-all"
                    />
                    <button onClick={() => navigate("/agendamentos/novo")} className="button-premium shadow-lg shadow-primary/20 w-full sm:w-auto">
                        <Plus size={18} /> Novo Agendamento
                    </button>
                </div>
            </div>

            {/* Navegação Principal por Status */}
            <div className="flex flex-col gap-4 bg-card/30 p-2 rounded-2xl border border-border/50">
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: "em_aberto", label: "Próximos", color: "text-primary", count: tabCounts.pro },
                        { id: "concluido", label: "Concluídos", color: "text-green-500", count: tabCounts.con },
                        { id: "pendente", label: "Atrasados", color: "text-destructive", count: tabCounts.atr },
                        { id: "arquivados", label: "Arquivados", color: "text-muted-foreground", count: tabCounts.arq }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveSubTab(tab.id as any)} 
                            className={`flex-1 min-w-[120px] relative flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl transition-all duration-300 ${
                                activeSubTab === tab.id 
                                ? "bg-background shadow-md border-b-2 border-primary" 
                                : "hover:bg-background/50 text-muted-foreground"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-black uppercase tracking-widest ${activeSubTab === tab.id ? tab.color : "text-muted-foreground"}`}>
                                    {tab.label}
                                </span>
                                <span className={`flex items-center justify-center min-w-[22px] h-5 px-1.5 text-[10px] font-black rounded-full transition-all duration-300 ${
                                    tab.id === 'em_aberto' ? "bg-primary/10 text-primary border border-primary/20" :
                                    tab.id === 'concluido' ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                                    tab.id === 'pendente' && tab.count > 0 ? "bg-destructive text-white border border-destructive/30" :
                                    tab.id === 'pendente' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                    "bg-muted/50 text-muted-foreground border border-border"
                                }`}>
                                    {tab.count}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Filtros Secundários */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1 border-t border-border/50 pt-3 mt-1">
                    <div className="flex items-center gap-4">
                        <div className="relative w-full max-w-sm">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input 
                                type="text" 
                                placeholder="Buscar nos agendamentos..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                                className="w-[200px] sm:w-[300px] pl-9 pr-4 py-2 border border-border/50 rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-all" 
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-lg border border-border/50">
                        <button 
                            onClick={() => setActiveTab("geral")} 
                            className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === "geral" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <div className="flex items-center gap-2"><LayoutDashboard size={14} /> Todos</div>
                        </button>
                        <button 
                            onClick={() => setActiveTab("meus")} 
                            className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === "meus" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <div className="flex items-center gap-2"><User size={14} /> Meus</div>
                        </button>
                    </div>
                </div>
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
