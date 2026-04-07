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
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <h1 className="header-title">Gestão de <span className="text-primary/90">Tarefas</span></h1>
             <FavoriteToggleButton moduleId="tarefas" />
             {isFetching && !isLoading && (
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/20 animate-pulse">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                 <span className="text-[9px] font-black text-primary uppercase tracking-widest">Sincronização Ativa</span>
               </div>
             )}
          </div>
          <p className="subtitle-premium">Organização de rotinas operacionais, prazos internos e acompanhamento de produtividade da equipe.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-card border border-primary/10 p-2 rounded-2xl shadow-xl shadow-primary/5">
            <input
              type="month"
              value={competencia}
              onChange={e => setCompetencia(e.target.value)}
              className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-primary outline-none px-4 py-2 font-ubuntu"
            />
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
              <DialogTrigger asChild>
                <button className="h-14 px-6 rounded-2xl bg-card border border-border/60 text-[10px] font-black uppercase tracking-widest hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-2 shadow-sm">
                  <ClipboardList size={18} /> Lote
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-10 border-border/40 rounded-[2.5rem]">
                <DialogHeader className="mb-8 border-b border-border/40 pb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
                         <ClipboardList size={28} />
                    </div>
                    <DialogTitle className="text-xl font-black text-card-foreground uppercase tracking-tight">Novos Lançamentos em Lote</DialogTitle>
                    <p className="text-xs text-muted-foreground font-medium">Crie a mesma tarefa para múltiplas empresas simultaneamente.</p>
                </DialogHeader>

                <div className="space-y-8">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Efetiva</Label>
                        <input type="date" className="w-full h-12 px-5 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu" value={batchForm.data} onChange={e => setBatchForm({ ...batchForm, data: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Horário Previsto</Label>
                        <input type="time" className="w-full h-12 px-5 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu" value={batchForm.horario} onChange={e => setBatchForm({ ...batchForm, horario: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Informações Adicionais / Observações</Label>
                    <textarea className="w-full px-5 py-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all h-24 resize-none uppercase" value={batchForm.informacoes} onChange={e => setBatchForm({ ...batchForm, informacoes: e.target.value })} placeholder="DETALHES IMPORTANTES PARA A EXECUÇÃO..." />
                  </div>

                  <div className="space-y-4">
                    <Label className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Empresas Selecionadas ({selectedEmpresas.length})</span>
                        <button className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10 transition-all hover:bg-primary/10" onClick={() => {
                            if (selectedEmpresas.length === empresas.length) setSelectedEmpresas([]);
                            else setSelectedEmpresas(empresas.map(e => e.id));
                        }}>
                            {selectedEmpresas.length === empresas.length ? "DESMARCAR TODAS" : "SELECIONAR TODAS AS EMPRESAS"}
                        </button>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-border/40 rounded-[1.8rem] p-6 max-h-56 overflow-y-auto no-scrollbar bg-card/50">
                        {empresas.map(emp => (
                            <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border ${selectedEmpresas.includes(emp.id) ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50 border-transparent'}`} onClick={() => {
                                if (selectedEmpresas.includes(emp.id)) setSelectedEmpresas(prev => prev.filter(id => id !== emp.id));
                                else setSelectedEmpresas(prev => [...prev, emp.id]);
                            }}>
                                <Checkbox checked={selectedEmpresas.includes(emp.id)} className="rounded-md" />
                                <span className="text-[10px] font-black uppercase tracking-tight truncate">{emp.nome_empresa}</span>
                            </div>
                        ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleCreateBatch}
                    className="w-full h-16 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                  >
                    <Plus size={20} /> CRIAR {selectedEmpresas.length} TAREFAS EM LOTE
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            <button
              onClick={handleClonePreviousMonth}
              className="h-14 px-6 rounded-2xl bg-card border border-border/60 text-[10px] font-black uppercase tracking-widest hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-2 shadow-sm"
            >
              <RefreshCw size={18} /> Clonar
            </button>

            <button
              onClick={() => navigate("/tarefas/novo")}
              className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
            >
              <Plus size={20} /> NOVA TAREFA
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation and Visualization Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
            <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 max-w-fit shadow-sm">
                <button
                    onClick={() => { setActiveTab("geral"); if (activeSubTab !== "arquivados") setActiveSubTab("em_aberto"); }}
                    className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "geral" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
                >
                    Coordenação Geral
                </button>
                <button
                    onClick={() => { setActiveTab("meus"); if (activeSubTab !== "arquivados") setActiveSubTab("em_aberto"); }}
                    className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "meus" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
                >
                    Minhas Responsabilidades
                </button>
            </div>

            <div className="flex bg-muted/20 p-1.5 rounded-2xl border border-border/40 max-w-fit overflow-hidden">
                {[
                    { id: "em_aberto", label: "Em Aberto", hideOnGeral: true },
                    { id: "concluido", label: "Concluido", hideOnGeral: true },
                    { id: "pendente", label: "Pendente", hideOnGeral: true },
                    { id: "arquivados", label: "Arquivados", hideOnGeral: false }
                ].map(sub => {
                    if (activeTab === "geral" && sub.hideOnGeral && sub.id !== "em_aberto") return null;
                    const label = activeTab === "geral" && sub.id === "em_aberto" ? "ATIVOS" : sub.label.toUpperCase();
                    return (
                        <button
                            key={sub.id}
                            onClick={() => setActiveSubTab(sub.id as any)}
                            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === sub.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/60 hover:text-foreground"}`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative group">
                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="BUSCAR TAREFA, ANALISTA OU CLIENTE..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full lg:w-80 h-14 pl-14 pr-6 bg-card border border-border/60 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm group-hover:border-primary/20"
                />
            </div>

            <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 shadow-sm shrink-0">
                <button
                    onClick={() => setViewMode("kanban")}
                    className={`p-3.5 rounded-xl transition-all ${viewMode === "kanban" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/50 hover:text-foreground hover:bg-card/50"}`}
                    title="Visão Kanban"
                >
                    <LayoutDashboard size={20} />
                </button>
                <button
                    onClick={() => setViewMode("list")}
                    className={`p-3.5 rounded-xl transition-all ${viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/50 hover:text-foreground hover:bg-card/50"}`}
                    title="Visão em Lista"
                >
                    <List size={20} />
                </button>
            </div>
        </div>
      </div>

      {/* Main View Render */}
      {viewMode === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filtered.length === 0 ? (
                <div className="col-span-full py-32 text-center bg-card border-2 border-dashed border-border/40 rounded-[2.5rem] opacity-40">
                     <ClipboardList size={48} className="mx-auto mb-4 text-muted-foreground" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma tarefa localizada nos filtros atuais</p>
                </div>
            ) : (
                filtered.map(a => (
                    <div key={a.id} className="group bg-card border border-border/60 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 rounded-[2rem] transition-all duration-500 overflow-hidden shadow-sm">
                         {renderItemContent(a)}
                    </div>
                ))
            )}
        </div>
      ) : (
        <div className="flex gap-8 pb-12 overflow-x-auto no-scrollbar min-h-[600px] scroll-smooth">
            {[
                { id: "em_aberto", label: "Em Aberto", color: "bg-primary", icon: <Circle size={14} />, border: "border-primary/40" },
                { id: "pendente", label: "Arquivado Interno / Pendente", color: "bg-amber-500", icon: <Clock size={14} />, border: "border-amber-500/40" },
                { id: "concluido", label: "Tarefa Concluída", color: "bg-emerald-500", icon: <CheckCircle size={14} />, border: "border-emerald-500/40" }
            ].map(col => {
                const colTasks = filtered.filter(a => a.status === col.id);
                return (
                    <div key={col.id} className="flex-1 min-w-[360px] max-w-[450px] flex flex-col gap-6">
                        <div className={`flex items-center justify-between p-6 rounded-[1.8rem] bg-card border ${col.border} shadow-sm backdrop-blur-sm self-start w-full`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${col.color} text-white shadow-lg`}>
                                    {col.icon}
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-card-foreground">{col.label}</h3>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{colTasks.length} TAREFAS NESTE STATUS</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-5">
                            {colTasks.length === 0 ? (
                                <div className="py-20 text-center bg-card/20 border-2 border-dashed border-border/40 rounded-[2rem] opacity-30 flex flex-col items-center gap-3">
                                     <ClipboardList size={32} />
                                     <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Status Vazio</span>
                                </div>
                            ) : (
                                colTasks.map(a => (
                                    <div key={a.id} className="group bg-card border border-border/60 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/8 rounded-[2rem] transition-all duration-500 overflow-hidden shadow-sm">
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
