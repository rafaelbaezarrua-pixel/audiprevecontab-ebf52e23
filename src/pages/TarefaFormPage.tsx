import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Clock, User, Save, ArrowLeft, ClipboardList, Building2 } from "lucide-react";
import { toast } from "sonner";

const TarefaFormPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;
    const [loading, setLoading] = useState(false);
    const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
    const [empresas, setEmpresas] = useState<{ id: string; nome_empresa: string }[]>([]);
    const [semPrazo, setSemPrazo] = useState(false);
    const [form, setForm] = useState({
        data: new Date().toISOString().split('T')[0],
        horario: "09:00",
        usuario_id: "",
        empresa_id: "",
        assunto: "",
        informacoes_adicionais: ""
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, full_name, nome_completo, user_id").eq("ativo", true);
                if (pErr) console.error("Erro ao carregar perfis:", pErr);
                
                const { data: emps, error: eErr } = await supabase.from("empresas").select("id, nome_empresa").order("nome_empresa");
                if (eErr) console.error("Erro ao carregar empresas:", eErr);
                setEmpresas(emps || []);

                if (profiles && profiles.length > 0) {
                    const userIds = profiles.filter(p => p.user_id).map(p => p.user_id);
                    const [{ data: roles }, { data: access }] = await Promise.all([
                        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
                        supabase.from("empresa_acessos").select("user_id").in("user_id", userIds)
                    ]);

                    const clientIds = new Set([
                        ...(roles?.filter(r => (r.role as any) === 'client').map(r => r.user_id) || []),
                        ...(access?.map(a => a.user_id) || [])
                    ]);

                    const mapped = profiles
                        .filter(u => u.user_id && !clientIds.has(u.user_id))
                        .map((u: any) => ({
                            id: u.user_id,
                            nome: u.nome_completo || u.full_name || "Sem Nome"
                        }));

                    setUsuarios(mapped);
                }
                
                // If editing, load the task data
                if (isEdit) {
                    const { data, error } = await supabase
                        .from("tarefas" as any)
                        .select("*")
                        .eq("id", id)
                        .single();
                    
                    if (error) {
                        toast.error("Erro ao carregar tarefa: " + error.message);
                        navigate("/tarefas");
                        return;
                    }

                    const task = data as any;
                    if (task) {
                        const isSemPrazo = !task.data;
                        setSemPrazo(isSemPrazo);
                        setForm({
                            data: task.data || new Date().toISOString().split('T')[0],
                            horario: task.horario ? task.horario.slice(0, 5) : "09:00",
                            usuario_id: task.usuario_id,
                            empresa_id: task.empresa_id || "",
                            assunto: task.assunto,
                            informacoes_adicionais: task.informacoes_adicionais || ""
                        });
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };
        loadData();
    }, [id, isEdit]);

    const handleSave = async () => {
        if (!semPrazo && (!form.data || !form.horario)) {
            toast.error("Preencha a data e o horário, ou marque a opção 'Sem Prazo'.");
            return;
        }
        if (!form.usuario_id || !form.assunto) {
            toast.error("Preencha todos os campos obrigatórios (Responsável e Assunto)!");
            return;
        }

        setLoading(true);
        try {
            const isAssignedToOther = form.usuario_id !== user?.id;
            // Todas começam como em_aberto para que o usuário confirme o recebimento
            const initialStatus = "em_aberto";

            // Criar historico da criação
            const historico = JSON.stringify([{
                status: initialStatus,
                data: new Date().toISOString(),
                usuario_id: user?.id || "",
                observacao: isAssignedToOther ? "Tarefa atribuída. Aguardando recebimento." : "Tarefa criada"
            }]);

            const payload: any = {
                ...form,
                data: semPrazo ? null : form.data,
                horario: semPrazo ? null : form.horario,
                empresa_id: form.empresa_id || null,
                criado_por: user?.id,
                competencia: semPrazo ? new Date().toISOString().slice(0, 7) : form.data.slice(0, 7),
                ...(!isEdit && { status: initialStatus, historico })
            };

            const { error } = isEdit 
                ? await (supabase.from("tarefas" as any).update(payload).eq("id", id) as any)
                : await (supabase.from("tarefas" as any).insert(payload) as any);
            
            if (error) throw error;

            toast.success(isEdit ? "Tarefa atualizada com sucesso!" : "Tarefa interna criada com sucesso!");
            navigate("/tarefas");
        } catch (err: any) {
            toast.error("Erro ao salvar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-4 py-3 border border-border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-primary outline-none transition-all";
    const labelCls = "block text-sm font-semibold text-muted-foreground mb-1.5 ml-1";

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-10">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate("/tarefas")}
                    className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground"
                    title="Voltar"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-sm font-black uppercase tracking-widest text-foreground">
                    {isEdit ? "Editar Tarefa Interna" : "Nova Tarefa Interna"}
                </h1>
            </div>

            <div className="glass-card p-6 md:p-8 space-y-8">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <input
                        type="checkbox"
                        id="semPrazo"
                        checked={semPrazo}
                        onChange={(e) => setSemPrazo(e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                        <label htmlFor="semPrazo" className="text-xs font-black uppercase tracking-widest text-card-foreground cursor-pointer select-none">
                            Tarefa sem prazo de entrega
                        </label>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">A tarefa nunca será marcada como pendente automaticamente</p>
                    </div>
                </div>

                {!semPrazo && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                        <div>
                            <label className={labelCls}>Prazo de Entrega *</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={form.data}
                                    onChange={e => setForm({ ...form, data: e.target.value })}
                                    className={inputCls + " pl-11"}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Horário *</label>
                            <div className="relative">
                                <Clock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="time"
                                    value={form.horario}
                                    onChange={e => setForm({ ...form, horario: e.target.value })}
                                    className={inputCls + " pl-11"}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className={labelCls}>Assunto da Tarefa *</label>
                        <div className="relative">
                            <ClipboardList size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                            <input
                                placeholder="EX: TAREFA INTERNA..."
                                value={form.assunto}
                                onChange={e => setForm({ ...form, assunto: e.target.value })}
                                className={inputCls + " pl-12 uppercase font-bold text-xs tracking-wide"}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Responsável *</label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                            <select
                                value={form.usuario_id}
                                onChange={e => setForm({ ...form, usuario_id: e.target.value })}
                                className={inputCls + " pl-12 appearance-none text-xs font-bold uppercase tracking-wide cursor-pointer"}
                            >
                                <option value="">SELECIONE QUEM RECEBERÁ A TAREFA...</option>
                                {usuarios.map(u => (
                                    <option key={u.id} value={u.id}>{u.nome} {u.id === user?.id ? "(EU)" : ""}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Empresa Vinculada (Opcional)</label>
                        <div className="relative">
                            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                            <select
                                value={form.empresa_id}
                                onChange={e => setForm({ ...form, empresa_id: e.target.value })}
                                className={inputCls + " pl-12 appearance-none text-xs font-bold uppercase tracking-wide cursor-pointer"}
                            >
                                <option value="">SELECIONE UMA EMPRESA SE HOUVER VÍNCULO...</option>
                                {empresas.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Demais Informações e Observações</label>
                        <textarea
                            rows={4}
                            placeholder="DESCREVA DETALHES ADICIONAIS PARA A EXECUÇÃO DA TAREFA..."
                            value={form.informacoes_adicionais}
                            onChange={e => setForm({ ...form, informacoes_adicionais: e.target.value })}
                            className={inputCls + " resize-none text-xs font-medium h-32 py-4 uppercase"}
                        />
                    </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-border/40">
                    <button
                        onClick={() => navigate("/tarefas")}
                        className="flex-1 px-6 py-4 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-[2] button-premium flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 h-14"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Save size={18} /> {isEdit ? "ATUALIZAR TAREFA" : "SALVAR TAREFA"}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TarefaFormPage;
