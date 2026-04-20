import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, Clock, User, Plus, X, ClipboardList, CheckCircle, Circle, RefreshCw, Trash2, LayoutDashboard, List, Pencil, Send, Play, Inbox, ArrowRight, MessageSquare, History, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { format, parseISO, lastDayOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTarefas, Tarefa } from "@/hooks/useTarefas";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDateBR, formatMonthYearBR } from "@/lib/utils";

// ── Status helpers ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; border: string }> = {
    recebida:     { label: "Recebida",     color: "text-blue-500",    bg: "bg-blue-500",    icon: <Inbox size={14} />,       border: "border-blue-500/20" },
    em_andamento: { label: "Em Andamento", color: "text-amber-500",   bg: "bg-amber-500",   icon: <Play size={14} />,        border: "border-amber-500/20" },
    resposta:     { label: "Resposta",     color: "text-purple-500",  bg: "bg-purple-500",  icon: <MessageSquare size={14} />, border: "border-purple-500/20" },
    concluido:    { label: "Concluída",    color: "text-emerald-500", bg: "bg-emerald-500", icon: <CheckCircle size={14} />,  border: "border-emerald-500/20" },
    em_aberto:    { label: "Em Aberto",    color: "text-sky-500",     bg: "bg-sky-500",     icon: <Circle size={14} />,      border: "border-sky-500/20" },
    pendente:     { label: "Pendente",     color: "text-orange-500",  bg: "bg-orange-500",  icon: <Clock size={14} />,       border: "border-orange-500/20" },
};

const STATUS_FLOW_LABELS: Record<string, string> = {
    recebida: "RECEBIDA",
    em_andamento: "EM ANDAMENTO",
    resposta: "RESPOSTA",
    concluido: "CONCLUSÃO",
};

const TarefasPage: React.FC = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    
    const [search, setSearch] = useState("");
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
    const [activeTab, setActiveTab] = useState<"por_mim" | "para_mim">("para_mim");
    const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");

    // Dialog states
    const [respostaDialogOpen, setRespostaDialogOpen] = useState(false);
    const [respostaText, setRespostaText] = useState("");
    const [respostaTarefaId, setRespostaTarefaId] = useState<string | null>(null);
    const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
    const [historicoTarefa, setHistoricoTarefa] = useState<Tarefa | null>(null);

    // Accordion state for kanban rows
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const { tarefas, isLoading, isFetching, updateStatus, updateArquivado, deleteTarefa } = useTarefas(competencia);
    
    // ── Auxiliary data ──────────────────────────────────────────────────
    const { data: usersData } = useQuery({
        queryKey: ["profiles_list"],
        queryFn: async () => {
             // 1. Buscar IDs de usuários que não são clientes
             const { data: rolesData } = await supabase
                .from("user_roles")
                .select("user_id")
                .neq("role", "client");
             
             const teamUserIds = rolesData?.map(r => r.user_id) || [];

             // 2. Buscar perfis desses usuários
             const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, full_name")
                .in("user_id", teamUserIds)
                .eq("ativo", true);
             
             return (profiles || []).map((u: any) => ({
                    id: u.user_id,
                    nome: u.full_name || "Sem Nome"
                }));
        },
        staleTime: 60000 * 10
    });

    const { data: empresasData } = useQuery({
        queryKey: ["empresas_list"],
        queryFn: async () => {
            const { data } = await supabase.from("empresas").select("id, nome_empresa").order("nome_empresa");
            return data || [];
        },
        staleTime: 60000 * 10
    });

    const usuarios = usersData || [];
    const empresas = empresasData || [];

    // ── Batch Cloning State ─────────────────────────────────────────────
    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [batchForm, setBatchForm] = useState({
        assunto: "",
        informacoes: "",
        data: new Date().toISOString().split('T')[0],
        horario: "09:00",
        responsavel_id: user?.id || "",
        semPrazo: false
    });
    const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);

    // ── Handlers ────────────────────────────────────────────────────────
    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await updateStatus.mutateAsync({ id, status: newStatus, userId: user?.id });
            toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus]?.label || newStatus}!`);
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        }
    };

    const handleSendResposta = async () => {
        if (!respostaTarefaId || !respostaText.trim()) {
            toast.error("Digite uma resposta antes de enviar.");
            return;
        }
        try {
            await updateStatus.mutateAsync({ 
                id: respostaTarefaId, 
                status: "resposta", 
                userId: user?.id,
                resposta: respostaText.trim() 
            });
            toast.success("Resposta enviada com sucesso!");
            setRespostaDialogOpen(false);
            setRespostaText("");
            setRespostaTarefaId(null);
        } catch (error: any) {
            toast.error("Erro ao enviar resposta: " + error.message);
        }
    };

    const handleUpdateArquivado = async (id: string, arquivado: boolean) => {
        try {
            await updateArquivado.mutateAsync({ id, arquivado });
            toast.success(arquivado ? "Tarefa arquivada!" : "Tarefa desarquivada!");
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        }
    };

    const handleDeleteTarefa = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.")) return;
        try {
            await deleteTarefa.mutateAsync(id);
            toast.success("Tarefa excluída com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message);
        }
    };

    const handleCreateBatch = async () => {
        if (!batchForm.assunto || !batchForm.responsavel_id || selectedEmpresas.length === 0) {
            toast.error("Preencha o assunto, responsável e selecione ao menos uma empresa.");
            return;
        }
        try {
            const isAssignedToOther = batchForm.responsavel_id !== user?.id;
            
            // Todas começam como em_aberto para que o usuário confirme o recebimento
            const initialStatus = "em_aberto";
            
            const historico = JSON.stringify([{
                status: initialStatus,
                data: new Date().toISOString(),
                usuario_id: user?.id || "",
                observacao: isAssignedToOther ? "Tarefa atribuída. Aguardando recebimento." : "Tarefa criada"
            }]);

            const inserts = selectedEmpresas.map(empId => ({
                assunto: batchForm.assunto,
                informacoes_adicionais: batchForm.informacoes,
                data: batchForm.semPrazo ? null : batchForm.data,
                horario: batchForm.semPrazo ? null : batchForm.horario,
                usuario_id: batchForm.responsavel_id,
                empresa_id: empId,
                criado_por: user?.id,
                competencia: batchForm.semPrazo ? new Date().toISOString().slice(0, 7) : batchForm.data.slice(0, 7),
                status: initialStatus,
                historico
            }));

            const { error } = await supabase.from("tarefas" as any).insert(inserts);
            if (error) throw error;

            toast.success(`${inserts.length} tarefas criadas com sucesso!`);
            setIsBatchOpen(false);
            setBatchForm({ ...batchForm, assunto: "", informacoes: "", semPrazo: false });
            setSelectedEmpresas([]);
        } catch (err: any) {
            toast.error("Erro nos lançamentos: " + err.message);
        }
    };

    const handleClonePreviousMonth = async () => {
        try {
            const currentYear = parseInt(competencia.slice(0, 4));
            const currentMonth = parseInt(competencia.slice(5, 7));
            let prevYear = currentYear;
            let prevMonth = currentMonth - 1;
            if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
            const prevCompetencia = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

            const { data: prevTasks, error: fetchError } = await supabase
                .from("tarefas" as any).select("*").eq("competencia", prevCompetencia);

            if (fetchError) throw fetchError;
            if (!prevTasks || prevTasks.length === 0) {
                toast.error("Nenhuma tarefa encontrada no mês anterior.");
                return;
            }
            if (!window.confirm(`Deseja clonar ${prevTasks.length} tarefas de ${formatMonthYearBR(prevCompetencia)} para ${formatMonthYearBR(competencia)}?`)) return;

            const clones = prevTasks.map((t: any) => {
                const originalDate = parseISO(t.data);
                const day = originalDate.getDate();
                const [year, month] = competencia.split('-').map(Number);
                let targetDate = new Date(year, month - 1, day);
                if (targetDate.getMonth() !== month - 1) {
                    targetDate = lastDayOfMonth(new Date(year, month - 1));
                }
                const newData = format(targetDate, "yyyy-MM-dd");
                const isAssignedToOther = t.criado_por !== t.usuario_id;
                return {
                    assunto: t.assunto,
                    informacoes_adicionais: t.informacoes_adicionais,
                    data: newData,
                    horario: t.horario,
                    usuario_id: t.usuario_id,
                    empresa_id: t.empresa_id,
                    criado_por: user?.id,
                    competencia: competencia,
                    status: "em_aberto",
                    arquivado: false,
                    historico: JSON.stringify([{ 
                        status: "em_aberto", 
                        data: new Date().toISOString(), 
                        usuario_id: user?.id || "", 
                        observacao: isAssignedToOther ? "Clonada do mês anterior. Aguardando recebimento." : "Clonada do mês anterior" 
                    }])
                };
            });

            const { error: insertError } = await supabase.from("tarefas" as any).insert(clones);
            if (insertError) throw insertError;
            toast.success(`${clones.length} tarefas clonadas com sucesso!`);
        } catch (err: any) {
            toast.error("Erro ao clonar tarefas: " + err.message);
        }
    };

    // ── Filtering ───────────────────────────────────────────────────────
    const filtered = tarefas.filter(a => {
        if (a.arquivado) return false;
        const matchSearch = a.assunto.toLowerCase().includes(search.toLowerCase()) ||
            a.usuario_nome?.toLowerCase().includes(search.toLowerCase()) ||
            a.criado_por_nome?.toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;

        if (activeTab === "por_mim") {
            // Tarefas que EU criei para OUTROS
            return a.criado_por === user?.id && a.usuario_id !== user?.id;
        } else {
            // Tarefas atribuídas A MIM (por outros ou por mim mesmo)
            return a.usuario_id === user?.id;
        }
    });

    // ── Status columns for kanban ───────────────────────────────────────
    const kanbanColumns = [
        { id: "pendente",     ...STATUS_CONFIG.pendente },
        { id: "em_aberto",    ...STATUS_CONFIG.em_aberto },
        { id: "recebida",     ...STATUS_CONFIG.recebida },
        { id: "em_andamento", ...STATUS_CONFIG.em_andamento },
        { id: "resposta",     ...STATUS_CONFIG.resposta },
        { id: "concluido",    ...STATUS_CONFIG.concluido },
    ];

    // ── Status badge ────────────────────────────────────────────────────
    const renderStatusBadge = (status: string) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.em_aberto;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${cfg.color} bg-black/5 dark:bg-white/5 border border-current/20`}>
                {React.cloneElement(cfg.icon as React.ReactElement, { size: 12 })} {cfg.label}
            </span>
        );
    };

    // ── Status flow indicator ───────────────────────────────────────────
    const renderStatusFlow = (a: Tarefa) => {
        const steps = ["recebida", "em_andamento", "resposta", "concluido"];
        let currentIdx = steps.indexOf(a.status);
        
        if (currentIdx === -1) {
            const hasBeenReceived = a.historico?.some(h => h.status === "recebida" || h.status === "em_andamento" || h.status === "resposta" || h.status === "concluido");
            const hasBeenStarted = a.historico?.some(h => h.status === "em_andamento" || h.status === "resposta" || h.status === "concluido");
            const hasBeenAnswered = a.historico?.some(h => h.status === "resposta" || h.status === "concluido");
            
            if (hasBeenAnswered) currentIdx = 2;
            else if (hasBeenStarted) currentIdx = 1;
            else if (hasBeenReceived) currentIdx = 0;
        }

        return (
            <div className="flex items-center gap-1 w-full py-1">
                {steps.map((step, idx) => {
                    const cfg = STATUS_CONFIG[step];
                    const isActive = idx <= currentIdx;
                    const isCurrent = step === a.status;
                    return (
                        <React.Fragment key={step}>
                            <div className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${
                                isCurrent ? `${cfg.bg} text-white` : isActive ? `${cfg.color} bg-black/5 dark:bg-white/5` : 'text-muted-foreground/20 bg-muted/5'
                            }`} title={STATUS_FLOW_LABELS[step]}>
                                {React.cloneElement(cfg.icon as React.ReactElement, { size: 12 })}
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={`h-[1px] flex-1 ${idx < currentIdx ? 'bg-primary/30' : 'bg-border/20'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    // ── Actions ─────────────────────────────────────────────────────────
    const renderAssigneeActions = (a: Tarefa) => {
        if (a.status === "concluido") {
            return (
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle size={14} /> Tarefa Concluída
                    </div>
                </div>
            );
        }

        const isParaMim = activeTab === "para_mim";
        const isSelfAssigned = a.criado_por === a.usuario_id;

        return (
            <div className="flex flex-wrap items-center gap-2 w-full">
                {/* AÇÕES QUANDO A TAREFA É MINHA ("Atribuídas a mim") */}
                {isParaMim && (
                    <>
                        {(() => {
                            const wasReceived = a.historico?.some(h => h.status === "recebida" || h.status === "em_andamento");
                            
                            // Se for Em Aberto/Pendente e foi outra pessoa quem criou
                            if ((a.status === "em_aberto" || a.status === "pendente") && !isSelfAssigned) {
                                if (!wasReceived) {
                                    return (
                                        <button
                                            onClick={() => handleUpdateStatus(a.id, "recebida")}
                                            className="flex-1 button-action bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white text-[10px] tracking-widest"
                                        >
                                            <Inbox size={14} /> Receber
                                        </button>
                                    );
                                } else {
                                    return (
                                        <button
                                            onClick={() => handleUpdateStatus(a.id, "em_andamento")}
                                            className="flex-1 button-action bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white text-[10px] tracking-widest"
                                        >
                                            <Play size={14} /> Iniciar
                                        </button>
                                    );
                                }
                            }

                            // Se for Em Aberto/Pendente e foi eu mesmo que criei
                            if ((a.status === "em_aberto" || a.status === "pendente") && isSelfAssigned) {
                                return (
                                    <button
                                        onClick={() => handleUpdateStatus(a.id, "concluido")}
                                        className="flex-1 button-action bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[10px] tracking-widest"
                                    >
                                        <CheckCircle size={14} /> Concluir
                                    </button>
                                );
                            }

                            if (a.status === "recebida") {
                                return (
                                    <button
                                        onClick={() => handleUpdateStatus(a.id, "em_andamento")}
                                        className="flex-1 button-action bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white text-[10px] tracking-widest"
                                    >
                                        <Play size={14} /> Iniciar
                                    </button>
                                );
                            }

                            if (a.status === "em_andamento") {
                                return (
                                    <button
                                        onClick={() => {
                                            setRespostaTarefaId(a.id);
                                            setRespostaText("");
                                            setRespostaDialogOpen(true);
                                        }}
                                        className="flex-1 button-action bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white text-[10px] tracking-widest"
                                    >
                                        <MessageSquare size={14} /> Responder
                                    </button>
                                );
                            }

                            if (a.status === "resposta") {
                                return (
                                    <button
                                        onClick={() => handleUpdateStatus(a.id, "concluido")}
                                        className="flex-1 button-action bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[10px] tracking-widest"
                                    >
                                        <CheckCircle size={14} /> Concluir
                                    </button>
                                );
                            }

                            return null;
                        })()}
                    </>
                )}

                {/* AÇÕES QUANDO A TAREFA É PARA OUTROS ("Atribuídas por mim") */}
                {!isParaMim && (
                    <>
                        {a.status === "resposta" && (
                            <button
                                onClick={() => handleUpdateStatus(a.id, "concluido")}
                                className="flex-1 button-action bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[10px] tracking-widest"
                            >
                                <CheckCircle size={14} /> Concluir
                            </button>
                        )}
                        
                        {a.status !== "resposta" && (
                            <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground/40 text-[9px] font-black uppercase tracking-widest">
                                Em Processamento
                            </div>
                        )}
                    </>
                )}

            </div>
        );
    };

    // ── Card content ────────────────────────────────────────────────────
    const renderItemContent = (a: Tarefa) => {
        const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.em_aberto;
        const isAssignee = activeTab === "para_mim";
        const showFlow = a.criado_por !== a.usuario_id; 

        return (
            <div className="p-5 space-y-4 h-full flex flex-col relative group/card">
                {/* Status Indicator Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bg} opacity-50`} />

                {/* Header */}
                <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                        <h3 className="font-bold text-foreground leading-snug text-sm flex-1 tracking-tight group-hover/card:text-primary transition-colors">
                            {a.assunto}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <button
                                onClick={() => { setHistoricoTarefa(a); setHistoricoDialogOpen(true); }}
                                className="p-2 rounded-lg text-muted-foreground/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-primary transition-all"
                            >
                                <History size={14} />
                            </button>
                            {(a.criado_por === user?.id || userData?.isAdmin) && (
                                <button
                                    onClick={() => navigate(`/tarefas/editar/${a.id}`)}
                                    className="p-2 rounded-lg text-muted-foreground/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-primary transition-all"
                                >
                                    <Pencil size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-col gap-1.5">
                        {isAssignee ? (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest">
                                <Send size={12} className="opacity-40" />
                                <span>De: <span className="text-foreground/80">{a.criado_por_nome}</span></span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest">
                                <User size={12} className="opacity-40" />
                                <span>Para: <span className="text-foreground/80">{a.usuario_nome}</span></span>
                            </div>
                        )}
                        {a.empresas?.nome_empresa && (
                            <div className="inline-flex px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary w-fit">
                                {a.empresas.nome_empresa}
                            </div>
                        )}
                    </div>
                </div>

                {/* Deadlines */}
                <div className="flex items-center gap-4 py-2 border-y border-border/10">
                    {a.data ? (
                        <>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                                <Calendar size={13} className="text-primary/50" />
                                {formatDateBR(a.data)}
                            </div>
                            {a.horario && (
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                                    <Clock size={13} className="text-primary/50" />
                                    {a.horario.slice(0, 5)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Sem prazo de entrega</div>
                    )}
                </div>

                {/* Status indicator flow */}
                {showFlow && (
                    <div className="py-1">
                        {renderStatusFlow(a)}
                    </div>
                )}
                {!showFlow && (
                    <div className="pt-1">
                        {renderStatusBadge(a.status)}
                    </div>
                )}

                {/* Additional Info / Comments */}
                {a.informacoes_adicionais && (
                    <div className="bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl text-[11px] text-muted-foreground/80 border border-border/20">
                        {a.informacoes_adicionais}
                    </div>
                )}

                {a.resposta && (
                    <div className="bg-primary/5 border border-primary/10 p-3 rounded-xl text-xs space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary opacity-60">Resposta Final</span>
                        <p className="text-foreground/80">{a.resposta}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 mt-auto">
                    {isAssignee && renderAssigneeActions(a)}
                    {!isAssignee && a.status === "resposta" && (
                        <button
                            onClick={() => handleUpdateStatus(a.id, "concluido")}
                            className="button-premium w-full text-[10px] py-3.5"
                        >
                            <CheckCircle size={14} /> CONCLUIR VERIFICAÇÃO
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // ── Loading ──────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando tarefas...</p>
            </div>
        );
    }

    // ── Counters ────────────────────────────────────────────────────────
    const countPorMim = tarefas.filter(a => !a.arquivado && a.criado_por === user?.id && a.usuario_id !== user?.id).length;
    const countParaMim = tarefas.filter(a => !a.arquivado && a.usuario_id === user?.id).length;

    return (
    <div className="space-y-4 animate-fade-in relative pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0 mt-2">
        <div className="space-y-1 -mt-4">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Tarefas Internas</h1>
            <FavoriteToggleButton moduleId="tarefas" />
            {isFetching && !isLoading && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Sincronizando</span>
              </div>
            )}
          </div>
          <p className="subtitle-premium">Gestão de fluxo e prazos operacionais do escritório.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 justify-end flex-1">
            <input
                type="month"
                value={competencia}
                onChange={e => setCompetencia(e.target.value)}
                className="h-11 px-4 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold transition-all w-full sm:w-auto"
            />
            
            <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
                <DialogTrigger asChild>
                    <button className="button-secondary-premium h-11 px-6 flex items-center gap-2">
                        <ClipboardList size={18} /> LOTE
                    </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border border-border/50 shadow-2xl">
                    <DialogHeader className="p-8 bg-muted/20 border-b border-border/50">
                        <DialogTitle className="text-xl font-black text-card-foreground uppercase tracking-tight">Novos Lançamentos em Lote</DialogTitle>
                        <p className="text-xs text-muted-foreground font-medium">Crie a mesma tarefa para múltiplas empresas simultaneamente.</p>
                    </DialogHeader>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assunto da Tarefa</Label>
                                <input className="w-full h-12 px-5 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all uppercase" value={batchForm.assunto} onChange={e => setBatchForm({ ...batchForm, assunto: e.target.value })} placeholder="EX: LANÇAMENTO DE NOTAS..." />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Responsável pela Execução</Label>
                                <select className="w-full h-12 px-5 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer" value={batchForm.responsavel_id} onChange={e => setBatchForm({ ...batchForm, responsavel_id: e.target.value })}>
                                    <option value="">SELECIONE O ANALISTA...</option>
                                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2 px-1">
                            <input
                                type="checkbox"
                                id="semPrazo"
                                checked={batchForm.semPrazo}
                                onChange={e => setBatchForm({ ...batchForm, semPrazo: e.target.checked })}
                                className="w-4 h-4 rounded border-border/40 text-primary focus:ring-primary/20"
                            />
                            <Label htmlFor="semPrazo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer">Tarefa Sem Prazo Definido</Label>
                        </div>

                        {!batchForm.semPrazo && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Efetiva</Label>
                                    <input type="date" className="w-full h-12 px-5 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={batchForm.data} onChange={e => setBatchForm({ ...batchForm, data: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Horário Previsto</Label>
                                    <input type="time" className="w-full h-12 px-5 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={batchForm.horario} onChange={e => setBatchForm({ ...batchForm, horario: e.target.value })} />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Informações Adicionais / Observações</Label>
                            <textarea className="w-full px-5 py-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all h-24 resize-none uppercase" value={batchForm.informacoes} onChange={e => setBatchForm({ ...batchForm, informacoes: e.target.value })} placeholder="DETALHES IMPORTANTES PARA A EXECUÇÃO..." />
                        </div>

                        <div className="space-y-4">
                            <Label className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Empresas Selecionadas ({selectedEmpresas.length})</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setSelectedEmpresas(empresas.map(e => e.id))} className="text-[10px] font-bold text-primary hover:underline">Selecionar Todas</button>
                                    <span className="text-border/40">|</span>
                                    <button onClick={() => setSelectedEmpresas([])} className="text-[10px] font-bold text-muted-foreground hover:underline">Limpar</button>
                                </div>
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-border/40 rounded-2xl p-4 max-h-56 overflow-y-auto custom-scrollbar bg-card/50">
                                {empresas.map(emp => (
                                    <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border ${selectedEmpresas.includes(emp.id) ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50 border-transparent'}`} onClick={() => {
                                        if (selectedEmpresas.includes(emp.id)) setSelectedEmpresas(prev => prev.filter(id => id !== emp.id));
                                        else setSelectedEmpresas(prev => [...prev, emp.id]);
                                    }}>
                                        <Checkbox checked={selectedEmpresas.includes(emp.id)} className="rounded-md" />
                                        <span className="text-[11px] font-bold text-card-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer uppercase truncate">{emp.nome_empresa}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-border/50">
                            <button onClick={() => setIsBatchOpen(false)} className="flex-1 h-12 rounded-xl border border-border/60 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all">Cancelar</button>
                            <button onClick={handleCreateBatch} className="flex-[2] h-12 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20" disabled={selectedEmpresas.length === 0 || !batchForm.assunto}>Criar {selectedEmpresas.length} Tarefas</button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <button
                onClick={handleClonePreviousMonth}
                className="button-secondary-premium h-11 px-6 flex items-center gap-2"
                title="Clonar tarefas do mês anterior"
            >
                <RefreshCw size={18} /> CLONAR
            </button>

            <button
                onClick={() => navigate("/tarefas/novo")}
                className="button-premium h-11 px-6 flex items-center gap-2"
            >
                <Plus size={18} /> NOVA TAREFA
            </button>
        </div>
      </div>

      {/* ── Main Tabs ────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mt-4">
        <div className="flex bg-muted/20 p-1.5 rounded-2xl border border-border/40">
            <button
                onClick={() => setActiveTab("para_mim")}
                className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "para_mim" ? "bg-background border border-border/50 text-primary" : "text-muted-foreground hover:bg-background/20"}`}
            >
                Atribuídas a mim
                {countParaMim > 0 && <span className="ml-2 py-0.5 px-2 bg-primary/10 rounded-full text-[10px]">{countParaMim}</span>}
            </button>
            <button
                onClick={() => setActiveTab("por_mim")}
                className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "por_mim" ? "bg-background border border-border/50 text-primary" : "text-muted-foreground hover:bg-background/20"}`}
            >
                Atribuídas por mim
                {countPorMim > 0 && <span className="ml-2 py-0.5 px-2 bg-primary/10 rounded-full text-[10px]">{countPorMim}</span>}
            </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 lg:max-w-3xl justify-end">
            <div className="relative w-full lg:w-96">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                    type="text"
                    placeholder="BUSCAR TAREFA, ANALISTA OU CLIENTE..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-muted/20 border border-border/40 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-muted-foreground/30"
                />
            </div>

            <div className="flex bg-muted/20 p-1 rounded-xl border border-border/40">
                <button
                    onClick={() => setViewMode("kanban")}
                    className={`p-2.5 rounded-lg transition-all ${viewMode === "kanban" ? "bg-background border border-border/50 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    title="Visão Kanban"
                >
                    <LayoutDashboard size={18} />
                </button>
                <button
                    onClick={() => setViewMode("list")}
                    className={`p-2.5 rounded-lg transition-all ${viewMode === "list" ? "bg-background border border-border/50 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    title="Visão em Lista"
                >
                    <List size={18} />
                </button>
            </div>
        </div>
      </div>

      {/* ── Main View ────────────────────────────────────────────────── */}
      {viewMode === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filtered.length === 0 ? (
                <div className="col-span-full py-32 text-center glass-card border-2 border-dashed border-border/40 opacity-40">
                     <ClipboardList size={48} className="mx-auto mb-4 text-muted-foreground" />
                     <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Nenhuma tarefa encontrada
                     </p>
                </div>
            ) : (
                filtered.map(a => (
                    <div key={a.id} className="glass-interactive overflow-hidden rounded-2xl">
                         {renderItemContent(a)}
                    </div>
                ))
            )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-12">
            {kanbanColumns.map(col => {
                const colTasks = filtered.filter(a => a.status === col.id);
                const isExpanded = expandedSections[col.id] !== false; // default open
                const toggleSection = () => setExpandedSections(prev => ({ ...prev, [col.id]: !isExpanded }));

                return (
                    <div key={col.id} className="glass-card overflow-hidden">
                        {/* Accordion Header */}
                        <button
                            onClick={toggleSection}
                            className={`w-full flex items-center justify-between p-5 md:p-6 transition-all duration-300 hover:bg-white/5 dark:hover:bg-black/10 ${isExpanded ? 'bg-white/5 dark:bg-black/10' : 'bg-transparent'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${col.bg} text-white shadow-lg shrink-0 transition-transform duration-300 ${isExpanded ? 'scale-100' : 'scale-90'}`}>
                                    {col.icon}
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-card-foreground">{col.label}</h3>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                        {colTasks.length} {colTasks.length === 1 ? 'TAREFA' : 'TAREFAS'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {colTasks.length > 0 && (
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${col.bg} text-white`}>
                                        {colTasks.length}
                                    </span>
                                )}
                                <ChevronDown 
                                    size={20} 
                                    className={`text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
                                />
                            </div>
                        </button>

                        {/* Accordion Body */}
                        <div 
                            className="overflow-hidden transition-all duration-500 ease-in-out"
                            style={{
                                maxHeight: isExpanded ? `${Math.max(colTasks.length * 450, 80)}px` : '0px',
                                opacity: isExpanded ? 1 : 0,
                            }}
                        >
                            <div className="p-4 md:p-6 pt-0 md:pt-0">
                                {colTasks.length === 0 ? (
                                    <div className="py-10 text-center bg-muted/10 border-2 border-dashed border-border/30 rounded-2xl opacity-40 flex flex-col items-center gap-2">
                                        <ClipboardList size={28} className="text-muted-foreground" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma tarefa neste status</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {colTasks.map(a => (
                                            <div key={a.id} className="glass-interactive overflow-hidden rounded-2xl">
                                                {renderItemContent(a)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {/* ── Resposta Dialog ──────────────────────────────────────────── */}
      <Dialog open={respostaDialogOpen} onOpenChange={setRespostaDialogOpen}>
        <DialogContent className="max-w-lg p-8 border-border/40 rounded-[2rem]">
            <DialogHeader className="mb-6 border-b border-border/40 pb-5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3">
                    <MessageSquare size={24} />
                </div>
                <DialogTitle className="text-lg font-black text-card-foreground uppercase tracking-tight">Enviar Resposta</DialogTitle>
                <p className="text-xs text-muted-foreground font-medium">Descreva o resultado da tarefa ou observações relevantes.</p>
            </DialogHeader>
            <div className="space-y-6 -mt-6">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sua Resposta</Label>
                    <textarea
                        className="w-full px-5 py-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/20 transition-all h-32 resize-none"
                        value={respostaText}
                        onChange={e => setRespostaText(e.target.value)}
                        placeholder="Descreva o que foi feito, observações ou informações relevantes..."
                        autoFocus
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setRespostaDialogOpen(false)}
                        className="flex-1 px-5 py-3.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSendResposta}
                        disabled={!respostaText.trim()}
                        className="flex-1 px-5 py-3.5 rounded-xl bg-purple-500 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Send size={16} /> Enviar Resposta
                    </button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* ── Historico Dialog ─────────────────────────────────────────── */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="max-w-lg p-8 border-border/40 rounded-[2rem]">
            <DialogHeader className="mb-6 border-b border-border/40 pb-5">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 mb-3">
                    <History size={24} />
                </div>
                <DialogTitle className="text-lg font-black text-card-foreground uppercase tracking-tight">Histórico da Tarefa</DialogTitle>
                {historicoTarefa && (
                    <p className="text-xs text-muted-foreground font-medium">{historicoTarefa.assunto}</p>
                )}
            </DialogHeader>
            <div className="space-y-1">
                {historicoTarefa?.historico && historicoTarefa.historico.length > 0 ? (
                    <div className="relative pl-6">
                        {/* Vertical line */}
                        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border" />
                        
                        {historicoTarefa.historico.map((h, idx) => {
                            const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.em_aberto;
                            return (
                                <div key={idx} className="relative pb-6 last:pb-0">
                                    {/* Dot */}
                                    <div className={`absolute -left-6 top-1 w-[18px] h-[18px] rounded-full ${cfg.bg} flex items-center justify-center ring-4 ring-background`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    </div>
                                    
                                    <div className="bg-card border border-border/60 rounded-xl p-3.5 ml-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                            <span className="text-[9px] font-medium text-muted-foreground">
                                                {format(new Date(h.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium">
                                            Por: {h.usuario_nome || "Sistema"}
                                        </p>
                                        {h.observacao && (
                                            <p className="text-xs text-foreground/80 mt-2 bg-muted/40 p-2 rounded-lg border border-border/40">
                                                {h.observacao}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-12 text-center opacity-40">
                        <History size={32} className="mx-auto mb-3 text-muted-foreground" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhum registro no histórico</p>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
    );
};

export default TarefasPage;
