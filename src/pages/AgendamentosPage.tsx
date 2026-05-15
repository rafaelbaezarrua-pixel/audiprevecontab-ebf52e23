import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, Clock, User, Plus, Save, X, ClipboardList, CheckCircle, Circle, RefreshCw, Trash2, LayoutDashboard, List, Pencil, AlertCircle, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { toast } from "sonner";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    format, 
    isAfter, 
    parseISO, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    addMonths, 
    subMonths, 
    addWeeks, 
    subWeeks,
    isToday,
    getDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useAgendamentos, Agendamento } from "@/hooks/useAgendamentos";

const AgendamentosPage: React.FC = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"geral" | "meus">("geral");
    const [activeSubTab, setActiveSubTab] = useState<"em_aberto" | "concluido" | "pendente" | "arquivados">("em_aberto");
    
    // Estados persistidos para retorno de navegação
    const [calendarDate, setCalendarDate] = useState<Date>(() => {
        const saved = localStorage.getItem("agendamentos_calendar_date");
        return saved ? new Date(saved) : new Date();
    });
    const [viewMode, setViewMode] = useState<"list" | "calendar">(() => {
        return (localStorage.getItem("agendamentos_view_mode") as "list" | "calendar") || "list";
    });
    const [calendarMode, setCalendarMode] = useState<"month" | "week">(() => {
        return (localStorage.getItem("agendamentos_calendar_mode") as "month" | "week") || "month";
    });
    const [competencia, setCompetencia] = useState(format(calendarDate, "yyyy-MM"));
    const [selectedDayDetails, setSelectedDayDetails] = useState<Date | null>(null);

    // Efeito para persistir estados
    useEffect(() => {
        localStorage.setItem("agendamentos_view_mode", viewMode);
        localStorage.setItem("agendamentos_calendar_mode", calendarMode);
        localStorage.setItem("agendamentos_calendar_date", calendarDate.toISOString());
    }, [viewMode, calendarMode, calendarDate]);
    
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
    
    // ── Calendar Logic ──────────────────────────────────────────────────
    const handlePrev = () => {
        let newDate;
        if (calendarMode === "month") newDate = subMonths(calendarDate, 1);
        else newDate = subWeeks(calendarDate, 1);
        
        setCalendarDate(newDate);
        setCompetencia(format(newDate, "yyyy-MM"));
    };

    const handleNext = () => {
        let newDate;
        if (calendarMode === "month") newDate = addMonths(calendarDate, 1);
        else newDate = addWeeks(calendarDate, 1);
        
        setCalendarDate(newDate);
        setCompetencia(format(newDate, "yyyy-MM"));
    };

    const calendarDays = (() => {
        const start = calendarMode === "month" 
            ? startOfWeek(startOfMonth(calendarDate)) 
            : startOfWeek(calendarDate);
        const end = calendarMode === "month" 
            ? endOfWeek(endOfMonth(calendarDate)) 
            : endOfWeek(calendarDate);
        return eachDayOfInterval({ start, end });
    })();

    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const renderCalendarView = () => (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-foreground capitalize tracking-tight">
                        {format(calendarDate, calendarMode === "month" ? "MMMM yyyy" : "'Semana de' dd 'de' MMMM", { locale: ptBR })}
                    </h2>
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/50">
                        <button onClick={handlePrev} className="p-2 hover:bg-background rounded-lg text-muted-foreground hover:text-primary transition-all"><ChevronLeft size={16} /></button>
                        <button onClick={() => {
                            const now = new Date();
                            setCalendarDate(now);
                            setCompetencia(format(now, "yyyy-MM"));
                        }} className="px-3 py-1 text-[10px] font-black uppercase hover:bg-background rounded-lg text-muted-foreground transition-all">Hoje</button>
                        <button onClick={handleNext} className="p-2 hover:bg-background rounded-lg text-muted-foreground hover:text-primary transition-all"><ChevronRight size={16} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-xl border border-border/50">
                    <button 
                        onClick={() => setCalendarMode("month")} 
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calendarMode === "month" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Mês
                    </button>
                    <button 
                        onClick={() => setCalendarMode("week")} 
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calendarMode === "week" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Semana
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-7 gap-px bg-border/30 rounded-2xl border border-border overflow-hidden shadow-inner ${calendarMode === 'month' ? '' : 'min-h-[500px]'}`}>
                {weekDays.map(day => (
                    <div key={day} className="bg-muted/30 py-3 text-center border-b border-border">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{day}</span>
                    </div>
                ))}

                {calendarDays.map((day, idx) => {
                    const dayAgendamentos = baseList.filter(a => isSameDay(day, parseISO(a.data)));
                    const isOtherMonth = !isSameMonth(day, calendarDate);
                    const today = isToday(day);

                    return (
                        <ContextMenu key={idx}>
                            <ContextMenuTrigger className="contents">
                                <div className={`bg-card min-h-[120px] p-2 flex flex-col gap-1 transition-all hover:bg-muted/5 group border-r border-b border-border/10 ${isOtherMonth ? 'opacity-30' : ''}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDayDetails(day);
                                            }}
                                            className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg transition-all cursor-pointer hover:scale-110 active:scale-95 ${today ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground group-hover:text-foreground hover:bg-muted'}`}
                                        >
                                            {format(day, "d")}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[150px] no-scrollbar">
                                        {dayAgendamentos.slice(0, 4).map(a => (
                                            <ContextMenu key={a.id}>
                                                <ContextMenuTrigger>
                                                    <button 
                                                        onClick={() => navigate(`/agendamentos/editar/${a.id}`)}
                                                        className={`w-full text-[9px] font-bold px-2 py-1.5 rounded-lg border text-left truncate transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                                            a.status === 'concluido' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                                                            getTemporalStatus(a) === 'atrasados' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                                                            'bg-primary/5 text-primary border-primary/20'
                                                        }`}
                                                    >
                                                        <span className="opacity-60 mr-1">{a.horario.slice(0, 5)}</span> {a.assunto}
                                                    </button>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent className="w-48">
                                                    <ContextMenuItem onClick={() => navigate(`/agendamentos/editar/${a.id}`)} className="gap-2">
                                                        <Edit size={14} /> Editar Agendamento
                                                    </ContextMenuItem>
                                                    {a.status !== 'concluido' ? (
                                                        <ContextMenuItem onClick={() => handleUpdateStatus(a.id, 'concluido')} className="gap-2 text-green-600">
                                                            <CheckCircle size={14} /> Marcar como Concluído
                                                        </ContextMenuItem>
                                                    ) : (
                                                        <ContextMenuItem onClick={() => handleUpdateStatus(a.id, 'pendente')} className="gap-2 text-muted-foreground">
                                                            <Circle size={14} /> Reabrir Agendamento
                                                        </ContextMenuItem>
                                                    )}
                                                    <ContextMenuItem onClick={() => handleDeleteAgendamento(a.id)} className="gap-2 text-destructive">
                                                        <Trash2 size={14} /> Excluir Registro
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        ))}
                                        {dayAgendamentos.length > 4 && (
                                            <span className="text-[8px] font-black text-muted-foreground/50 text-center uppercase py-1">
                                                + {dayAgendamentos.length - 4} mais
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56">
                                <ContextMenuItem onClick={() => setSelectedDayDetails(day)} className="gap-2">
                                    <List size={16} className="text-muted-foreground" /> Abrir detalhes do dia
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => navigate(`/agendamentos/novo?date=${format(day, "yyyy-MM-dd")}`)} className="gap-2 font-bold">
                                    <Plus size={16} className="text-primary" /> Novo Agendamento ({format(day, "dd/MM")})
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    );
                })}
            </div>

            {/* ── Day Details Dialog ────────────────────────────────────── */}
            <Dialog open={!!selectedDayDetails} onOpenChange={(open) => !open && setSelectedDayDetails(null)}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2rem] border-border/40 shadow-2xl">
                    <div className="bg-muted/30 p-8 border-b border-border/50">
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black tracking-tight text-foreground">
                                        {selectedDayDetails && format(selectedDayDetails, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                    </h2>
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                                        Detalhamento de compromissos
                                    </p>
                                </div>
                                <div className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
                                    <span className="text-xs font-black text-primary uppercase">
                                        {selectedDayDetails && baseList.filter(a => isSameDay(selectedDayDetails, parseISO(a.data))).length} Registros
                                    </span>
                                </div>
                            </DialogTitle>
                        </DialogHeader>
                    </div>

                    <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4 no-scrollbar">
                        {selectedDayDetails && (() => {
                            const dayAgendamentos = baseList.filter(a => isSameDay(selectedDayDetails, parseISO(a.data)));
                            if (dayAgendamentos.length === 0) {
                                return (
                                    <div className="py-12 text-center opacity-40">
                                        <Calendar size={48} className="mx-auto mb-4 text-muted-foreground" />
                                        <p className="text-sm font-bold uppercase tracking-widest">Nenhum agendamento para este dia</p>
                                    </div>
                                );
                            }
                            return dayAgendamentos.map(a => (
                                <div key={a.id} className="group relative bg-card hover:bg-muted/20 border border-border/50 p-6 rounded-[1.5rem] transition-all hover:shadow-lg">
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg border border-border/50">
                                                    <Clock size={14} className="text-primary" />
                                                    <span className="text-xs font-black text-foreground">{a.horario.slice(0, 5)}</span>
                                                </div>
                                                <div className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                                                    a.status === 'concluido' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                                                    getTemporalStatus(a) === 'atrasados' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                                                    'bg-primary/10 text-primary border-primary/20'
                                                }`}>
                                                    {a.status === 'concluido' ? 'Concluído' : getTemporalStatus(a) === 'atrasados' ? 'Atrasado' : 'Pendente'}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-bold text-card-foreground leading-tight group-hover:text-primary transition-colors">
                                                    {a.assunto}
                                                </h3>
                                                {a.informacoes_adicionais && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {a.informacoes_adicionais}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 pt-2 border-t border-border/20">
                                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                                    <User size={14} />
                                                    <span>{a.usuario_nome || "Responsável não definido"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                            <button 
                                                onClick={() => {
                                                    setSelectedDayDetails(null);
                                                    navigate(`/agendamentos/editar/${a.id}`);
                                                }}
                                                className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 transition-all"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAgendamento(a.id)}
                                                className="p-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive hover:text-white transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>

                    <div className="p-6 bg-muted/20 border-t border-border/50 flex justify-end">
                        <button 
                            onClick={() => {
                                const dateStr = format(selectedDayDetails!, "yyyy-MM-dd");
                                setSelectedDayDetails(null);
                                navigate(`/agendamentos/novo?date=${dateStr}`);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus size={18} /> Adicionar Novo Agendamento
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );

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
                <div className="space-y-1 -mt-2">
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
                    <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border/50">
                        <button 
                            onClick={() => setViewMode("list")} 
                            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            title="Visualização em Lista"
                        >
                            <List size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode("calendar")} 
                            className={`p-2 rounded-lg transition-all ${viewMode === "calendar" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            title="Visualização em Calendário"
                        >
                            <Calendar size={18} />
                        </button>
                    </div>

                    {viewMode === "list" && (
                        <input
                            type="month"
                            value={competencia}
                            onChange={e => setCompetencia(e.target.value)}
                            className="w-full sm:w-40 px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold transition-all"
                        />
                    )}
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

            {viewMode === "list" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                    {filtered.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/50">
                            Nenhum agendamento encontrado para os filtros aplicados.
                        </div>
                    ) : (
                        filtered.map(a => <React.Fragment key={a.id}>{renderItemContent(a)}</React.Fragment>)
                    )}
                </div>
            ) : (
                renderCalendarView()
            )}
        </div>
    );
};

export default AgendamentosPage;
