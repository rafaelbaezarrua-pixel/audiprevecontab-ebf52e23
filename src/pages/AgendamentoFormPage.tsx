import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Clock, User, Save, ArrowLeft, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useAgendamentos } from "@/hooks/useAgendamentos";

const AgendamentoFormPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;
    const [loading, setLoading] = useState(false);
    const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
    const [form, setForm] = useState({
        data: new Date().toISOString().split('T')[0],
        horario: "09:00",
        usuario_id: "",
        assunto: "",
        informacoes_adicionais: ""
    });

    // We use the hook mainly for the mutations
    const { createAgendamento, updateAgendamento } = useAgendamentos(form.data.slice(0, 7));

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const { data: profiles } = await supabase.from("profiles").select("id, full_name, nome_completo, user_id").eq("ativo", true);
                if (!profiles) return;

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

                // If editing, load the appointment data
                if (isEdit) {
                    const { data, error } = await supabase
                        .from("agendamentos" as any)
                        .select("*")
                        .eq("id", id)
                        .single();
                    
                    if (error) {
                        toast.error("Erro ao carregar agendamento: " + error.message);
                        navigate("/agendamentos");
                        return;
                    }

                    const agData = data as any;
                    if (agData) {
                        setForm({
                            data: agData.data,
                            horario: agData.horario.slice(0, 5),
                            usuario_id: agData.usuario_id,
                            assunto: agData.assunto,
                            informacoes_adicionais: agData.informacoes_adicionais || ""
                        });
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };
        loadUsers();
    }, [id, isEdit, navigate]);

    const handleSave = async () => {
        if (!form.data || !form.usuario_id || !form.assunto) {
            toast.error("Preencha os campos obrigatórios!");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...form,
                criado_por: user?.id,
                competencia: form.data.slice(0, 7)
            };

            if (isEdit) {
                await updateAgendamento.mutateAsync({ id: id as string, payload });
                toast.success("Agendamento atualizado com sucesso!");
            } else {
                await createAgendamento.mutateAsync(payload);
                toast.success("Agendamento criado com sucesso!");
            }

            navigate("/agendamentos");
        } catch (err: any) {
            toast.error("Erro ao salvar: " + err.message);
        } finally {
            setLoading(false);
        }
    };


    const inputCls = "w-full px-4 py-3 border border-border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-primary outline-none transition-all";
    const labelCls = "block text-sm font-semibold text-muted-foreground mb-1.5 ml-1";

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-10">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate("/agendamentos")}
                    className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                    title="Voltar"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelCls}>Data do Agendamento *</label>
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

                <div>
                    <label className={labelCls}>Responsável pelo Agendamento *</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <select
                            value={form.usuario_id}
                            onChange={e => setForm({ ...form, usuario_id: e.target.value })}
                            className={inputCls + " pl-11 appearance-none"}
                        >
                            <option value="">Selecione quem receberá o agendamento...</option>
                            {usuarios.map(u => (
                                <option key={u.id} value={u.id}>{u.nome} {u.id === user?.id ? "(Eu)" : ""}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Assunto *</label>
                    <div className="relative">
                        <ClipboardList size={18} className="absolute left-3.5 top-4 text-muted-foreground" />
                        <input
                            placeholder="Ex: Reunião com cliente Alpha"
                            value={form.assunto}
                            onChange={e => setForm({ ...form, assunto: e.target.value })}
                            className={inputCls + " pl-11"}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Demais Informações</label>
                    <textarea
                        rows={5}
                        placeholder="Detalhes adicionais, pauta da reunião, links, etc..."
                        value={form.informacoes_adicionais}
                        onChange={e => setForm({ ...form, informacoes_adicionais: e.target.value })}
                        className={inputCls + " resize-none"}
                    />
                </div>

                <div className="flex gap-4 pt-4 border-t border-border">
                    <button
                        onClick={() => navigate("/agendamentos")}
                        className="flex-1 px-6 py-3.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-colors disabled:opacity-50"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 button-premium flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Save size={20} /> {isEdit ? "Atualizar Agendamento" : "Salvar Agendamento"}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgendamentoFormPage;
