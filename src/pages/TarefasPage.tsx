import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, Clock, User, Plus, Save, X, ClipboardList, CheckCircle, Circle, RefreshCw, Trash2, LayoutDashboard, List, Pencil } from "lucide-react";
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
import { Button } from "@/components/ui/button";

const TarefasPage: React.FC = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    
    const [search, setSearch] = useState("");
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
    const [activeTab, setActiveTab] = useState<"geral" | "meus">("geral");
    const [activeSubTab, setActiveSubTab] = useState<"em_aberto" | "concluido" | "pendente" | "arquivados">("em_aberto");
    const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");

    const { tarefas, isLoading, isFetching, updateStatus, updateArquivado, deleteTarefa } = useTarefas(competencia);
    
    // Auxiliary data for filters and batch
    const { data: usersData } = useQuery({
        queryKey: ["profiles_list"],
        queryFn: async () => {
             const { data } = await supabase.from("profiles").select("id, full_name, user_id").eq("ativo", true);
             return (data || []).filter((u: any) => u.user_id).map((u: any) => ({
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

    // Batch Cloning State
    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [batchForm, setBatchForm] = useState({
        assunto: "",
        informacoes: "",
        data: new Date().toISOString().split('T')[0],
        horario: "09:00",
        responsavel_id: user?.id || ""
    });
    const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);

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
            toast.success(arquivado ? "Tarefa arquivada!" : "Tarefa desarquivada!");
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        }
    };

    const handleDeleteTarefa = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.")) {
            return;
        }

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
            const inserts = selectedEmpresas.map(empId => ({
                assunto: batchForm.assunto,
                informacoes_adicionais: batchForm.informacoes,
                data: batchForm.data,
                horario: batchForm.horario,
                usuario_id: batchForm.responsavel_id,
                empresa_id: empId,
                criado_por: user?.id,
                competencia: batchForm.data.slice(0, 7)
            }));

            const { error } = await supabase.from("tarefas" as any).insert(inserts);
            if (error) throw error;

            toast.success(`${inserts.length} tarefas criadas com sucesso!`);
            setIsBatchOpen(false);
            setBatchForm({ ...batchForm, assunto: "", informacoes: "" });
            setSelectedEmpresas([]);
            // Invalidar cache
            supabase.from("tarefas" as any).select("id").limit(1).then(() => {
                // Trigger refetch by re-fetching competencia? No, React Query invalidation is better
                // But we don't have access to queryClient here easily without useQueryClient
            });
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
            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear -= 1;
            }
            const prevCompetencia = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

            const { data: prevTasks, error: fetchError } = await supabase
                .from("tarefas" as any)
                .select("*")
                .eq("competencia", prevCompetencia);

            if (fetchError) throw fetchError;
            if (!prevTasks || prevTasks.length === 0) {
                toast.error("Nenhuma tarefa encontrada no mês anterior.");
                return;
            }

            if (!window.confirm(`Deseja clonar ${prevTasks.length} tarefas de ${prevCompetencia} para ${competencia}?`)) {
                return;
            }

            const clones = prevTasks.map((t: any) => {
                const originalDate = parseISO(t.data);
                const day = originalDate.getDate();

                // Parse current competence (YYYY-MM)
                const [year, month] = competencia.split('-').map(Number);
                let targetDate = new Date(year, month - 1, day);

                // Check if the day exists in the target month (overflow check)
                if (targetDate.getMonth() !== month - 1) {
                    targetDate = lastDayOfMonth(new Date(year, month - 1));
                }

                const newData = format(targetDate, "yyyy-MM-dd");

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
                    arquivado: false
                };
            });

            const { error: insertError } = await supabase.from("tarefas" as any).insert(clones);
            if (insertError) throw insertError;

            toast.success(`${clones.length} tarefas clonadas com sucesso!`);
        } catch (err: any) {
            toast.error("Erro ao clonar tarefas: " + err.message);
        }
    };

    const filtered = tarefas.filter(a => {
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
            return matchSearch && (activeSubTab === "em_aberto" ? true : a.status === activeSubTab);
        } else {
            const matchUser = isMine;
            if (activeSubTab === "arquivados") {
                return matchSearch && matchUser;
            }
            return matchSearch && matchUser && (activeSubTab === "em_aberto" ? a.status === "em_aberto" : a.status === activeSubTab);
        }
    });

    const renderItemContent = (a: Tarefa) => (
        <div className={`
                p-4 space-y-3 h-full bg-card group relative
                border-l-4 ${a.status === 'concluido' ? 'border-l-green-500 opacity-90' : a.status === 'pendente' ? 'border-l-amber-500' : 'border-l-primary'}
            `}>
            <div className="flex items-start justify-between">
                <div className="space-y-1 w-full">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-card-foreground leading-tight text-sm flex-1">{a.assunto}</h3>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button
                                onClick={() => navigate(`/tarefas/editar/${a.id}`)}
                                className="p-1.5 rounded-md text-primary/70 hover:bg-primary/10 hover:text-primary transition-all"
                                title="Editar"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={() => handleDeleteTarefa(a.id)}
                                className="p-1.5 rounded-md text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all"
                                title="Excluir"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 pt-1">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                            <User size={12} className="text-primary/70" /> Para: <span className="text-foreground">{a.usuario_nome}</span>
                        </p>
                        {a.criado_por_nome && a.criado_por_nome !== a.usuario_nome && (
                            <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5 italic pl-1">
                                Atribuído por: {a.criado_por_nome}
                            </p>
                        )}
                    </div>
                    {a.empresas?.nome_empresa && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 bg-primary/5 px-2 py-0.5 rounded-md w-fit mt-1">
                            {a.empresas.nome_empresa}
                        </p>
                    )}
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
                </div>
            )}
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando tarefas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 flex flex-col min-h-[calc(100vh-100px)] animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
                    <FavoriteToggleButton moduleId="tarefas" />
                    {isFetching && !isLoading && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-tight">Sincronizando...</span>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3 justify-end">
                    <input
                        type="month"
                        value={competencia}
                        onChange={e => setCompetencia(e.target.value)}
                        className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold"
                    />
                    <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
                        <DialogTrigger asChild>
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 text-primary bg-primary/5 text-sm font-bold hover:bg-primary/10 transition-all">
                                <ClipboardList size={18} /> Lançamentos
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>Lançamentos de Tarefas</DialogTitle></DialogHeader>
                            <div className="space-y-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Assunto</Label>
                                        <input className="w-full px-4 py-2 border rounded-lg" value={batchForm.assunto} onChange={e => setBatchForm({ ...batchForm, assunto: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Responsável</Label>
                                        <select className="w-full px-4 py-2 border rounded-lg" value={batchForm.responsavel_id} onChange={e => setBatchForm({ ...batchForm, responsavel_id: e.target.value })}>
                                            <option value="">Selecione...</option>
                                            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Data</Label>
                                        <input type="date" className="w-full px-4 py-2 border rounded-lg" value={batchForm.data} onChange={e => setBatchForm({ ...batchForm, data: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Horário</Label>
                                        <input type="time" className="w-full px-4 py-2 border rounded-lg" value={batchForm.horario} onChange={e => setBatchForm({ ...batchForm, horario: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Informações Adicionais</Label>
                                    <textarea className="w-full px-4 py-2 border rounded-lg h-20 resize-none" value={batchForm.informacoes} onChange={e => setBatchForm({ ...batchForm, informacoes: e.target.value })} />
                                </div>

                                <div className="space-y-3">
                                    <Label className="flex items-center justify-between">
                                        Selecione as Empresas ({selectedEmpresas.length})
                                        <button className="text-xs text-primary font-bold" onClick={() => {
                                            if (selectedEmpresas.length === empresas.length) setSelectedEmpresas([]);
                                            else setSelectedEmpresas(empresas.map(e => e.id));
                                        }}>
                                            {selectedEmpresas.length === empresas.length ? "Desmarcar Todas" : "Selecionar Todas"}
                                        </button>
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-xl p-4 max-h-48 overflow-y-auto bg-muted/20">
                                        {empresas.map(emp => (
                                            <div key={emp.id} className="flex items-center gap-3 p-2 hover:bg-card rounded-lg transition-colors cursor-pointer" onClick={() => {
                                                if (selectedEmpresas.includes(emp.id)) setSelectedEmpresas(prev => prev.filter(id => id !== emp.id));
                                                else setSelectedEmpresas(prev => [...prev, emp.id]);
                                            }}>
                                                <Checkbox checked={selectedEmpresas.includes(emp.id)} />
                                                <span className="text-xs font-medium truncate">{emp.nome_empresa}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Button className="w-full button-premium" onClick={handleCreateBatch}>
                                    Criar Tarefas em Lote
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <button
                        onClick={handleClonePreviousMonth}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 text-primary bg-primary/5 text-sm font-bold hover:bg-primary/10 transition-all"
                    >
                        <RefreshCw size={18} /> Clonar Mês Anterior
                    </button>

                    <button
                        onClick={() => navigate("/tarefas/novo")}
                        className="button-premium shadow-md"
                    >
                        <Plus size={18} /> Nova Tarefa
                    </button>
                </div>
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
                        Minhas Tarefas
                    </button>
                </div>

                <div className="flex gap-2 p-1 bg-muted/30 rounded-lg w-fit">
                    {[
                        { id: "em_aberto", label: "Em Aberto", hideOnGeral: true },
                        { id: "concluido", label: "Concluído", hideOnGeral: true },
                        { id: "pendente", label: "Pendente", hideOnGeral: true },
                        { id: "arquivados", label: "Arquivados", hideOnGeral: false }
                    ].map(sub => {
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


                <div className="flex gap-2 p-1 bg-muted/20 border border-border/50 rounded-xl shrink-0">
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        title="Lista"
                    >
                        <List size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode("kanban")}
                        className={`p-2 rounded-lg transition-all ${viewMode === "kanban" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        title="Kanban"
                    >
                        <LayoutDashboard size={18} />
                    </button>
                </div>
            </div>

            <div className="relative max-w-sm shrink-0">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar tarefa ou usuário..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                />
            </div>

            {viewMode === "list" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                    {filtered.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                            Nenhuma tarefa encontrada para este período.
                        </div>
                    ) : (
                        filtered.map(a => <React.Fragment key={a.id}>{renderItemContent(a)}</React.Fragment>)
                    )}
                </div>
            ) : (
                <div className="flex gap-6 pb-10 overflow-x-auto no-scrollbar min-h-[500px]">
                    {[
                        { id: "em_aberto", label: "Em Aberto", color: "bg-primary" },
                        { id: "pendente", label: "Pendente", color: "bg-amber-500" },
                        { id: "concluido", label: "Concluído", color: "bg-green-500" }
                    ].map(col => {
                        const colTasks = filtered.filter(a => a.status === col.id);
                        return (
                            <div key={col.id} className="flex-1 min-w-[300px] flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${col.color}`} />
                                        <h3 className="font-bold text-sm tracking-tight">{col.label}</h3>
                                        <span className="text-[10px] font-black bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{colTasks.length}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {colTasks.length === 0 ? (
                                        <div className="py-8 text-center text-[10px] text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">Vazio</div>
                                    ) : (
                                        colTasks.map(a => (
                                            <div key={a.id} className="rounded-xl overflow-hidden shadow-sm border border-border">
                                                {renderItemContent(a)}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TarefasPage;
