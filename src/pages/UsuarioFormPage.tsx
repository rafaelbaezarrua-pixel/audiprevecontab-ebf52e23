import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Shield, ArrowLeft, Save, ChevronRight, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { maskCPF } from "@/lib/utils";


const moduleLabels: Record<string, string> = {
    societario: "Societário",
    fiscal: "Fiscal",
    pessoal: "Pessoal",
    certificados: "Certificados",
    certidoes: "Certidões",
    licencas: "Licenças",
    procuracoes: "Procurações",
    vencimentos: "Vencimentos",
    parcelamentos: "Parcelamentos",
    recalculos: "Recálculos",
    honorarios: "Honorários",
    agendamentos: "Agendamentos",
    declaracoes_anuais: "Declarações Anuais",
    declaracoes_mensais: "Declarações Mensais",
};

const UsuarioFormPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        nome: "",
        cpf: "",
        email: "",
        isAdmin: false,
        modules: {} as Record<string, boolean>
    });



    const handleCreateUser = async () => {
        if (!form.nome.trim() || !form.email.trim() || !form.cpf.trim()) {
            toast.error("Nome, CPF e e-mail são obrigatórios");
            return;
        }

        setLoading(true);
        try {
            console.log("Chamando Edge Function create-user...");

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                console.error("Token não encontrado na sessão");
                toast.error("Sessão expirada. Por favor, faça login novamente.");
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.functions.invoke("create-user", {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: {
                    email: form.email,
                    nome: form.nome,
                    cpf: form.cpf,
                    isAdmin: form.isAdmin,
                    modules: form.modules
                }
            });

            if (error) {
                // Em caso de FunctionsHttpError, o context pode ser o objeto Response original
                const errorContext = (error as any).context;
                if (errorContext instanceof Response) {
                    try {
                        const body = await errorContext.json();
                        if (body.error) throw new Error(body.error);
                    } catch (e: any) {
                        if (e.message && e.message !== "Unexpected end of JSON input") throw e;
                    }
                }

                if (error.message?.includes("Failed to send a request")) {
                    throw new Error("Não foi possível conectar à Edge Function.");
                }
                throw error;
            }

            if (data?.error) throw new Error(data.error);

            toast.success("Usuário criado com sucesso! Um e-mail com link para definição de senha foi enviado.");
            navigate("/configuracoes");
        } catch (err: any) {
            console.error("Erro no cadastro:", err);

            let errorMessage = err.message || "Erro desconhecido";

            if (err.context?.json?.error) {
                errorMessage = err.context.json.error;
            } else if (err.context?.error) {
                errorMessage = err.context.error;
            }

            toast.error("Erro no Cadastro: " + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-4 py-3 border border-border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-primary outline-none transition-all";
    const labelCls = "block text-sm font-semibold text-muted-foreground mb-1.5 ml-1";

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-10">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate("/configuracoes")}
                    aria-label="Voltar para configurações"
                    title="Voltar"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                            <User size={18} className="text-primary" /> Informações Básicas
                        </h2>

                        <div>
                            <label htmlFor="nome" className={labelCls}>Nome Completo *</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="nome"
                                    placeholder="Nome do colaborador"
                                    value={form.nome}
                                    onChange={e => setForm({ ...form, nome: e.target.value })}
                                    className={inputCls + " pl-11"}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="cpf" className={labelCls}>CPF *</label>
                            <div className="relative">
                                <Fingerprint size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="cpf"
                                    placeholder="000.000.000-00"
                                    value={form.cpf}
                                    onChange={e => setForm({ ...form, cpf: maskCPF(e.target.value) })}

                                    className={inputCls + " pl-11"}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className={labelCls}>E-mail *</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="exemplo@email.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className={inputCls + " pl-11"}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-info/10 border border-info/20 rounded-xl">
                            <p className="text-sm text-info flex items-center gap-2">
                                <Mail size={16} /> Um convite será enviado para este e-mail para definição de senha.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                            <input
                                type="checkbox"
                                id="isAdmin"
                                checked={form.isAdmin}
                                onChange={e => setForm({ ...form, isAdmin: e.target.checked })}
                                className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                            />
                            <label htmlFor="isAdmin" className="text-sm font-bold text-card-foreground cursor-pointer flex items-center gap-2">
                                <Shield size={16} className={form.isAdmin ? "text-primary" : "text-muted-foreground"} />
                                Este usuário é Administrador?
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                            <Shield size={18} className="text-primary" /> Módulos Disponíveis
                        </h2>
                        <p className="text-xs text-muted-foreground mb-4">Selecione quais áreas o usuário terá acesso (Admins têm acesso total).</p>

                        <div className="grid grid-cols-1 gap-2">
                            {Object.entries(moduleLabels).map(([key, label]) => (
                                <label
                                    key={key}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${form.modules[key] || form.isAdmin
                                        ? "bg-primary/5 border-primary/30 text-primary"
                                        : "bg-card border-border text-muted-foreground hover:border-primary/20"
                                        } ${form.isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            disabled={form.isAdmin}
                                            checked={form.modules[key] || form.isAdmin}
                                            onChange={e => setForm({ ...form, modules: { ...form.modules, [key]: e.target.checked } })}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium">{label}</span>
                                    </div>
                                    {(form.modules[key] || form.isAdmin) && <ChevronRight size={14} className="text-primary" />}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-border">
                    <button
                        onClick={() => navigate("/configuracoes")}
                        className="flex-1 px-6 py-4 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-colors disabled:opacity-50"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreateUser}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                        style={{ background: "var(--gradient-primary)" }}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Save size={20} /> Finalizar Cadastro</>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-info/5 border border-info/20 rounded-2xl p-4 flex gap-3">
                <Shield size={20} className="text-info shrink-0 mt-0.5" />
                <p className="text-xs text-info/80 leading-relaxed">
                    <strong>Lembrete:</strong> Ao criar um usuário, ele receberá um convite por e-mail para definir sua senha e acessar o sistema. Certifique-se de que a Edge Function do Supabase foi implantada corretamente para processar este cadastro.
                </p>
            </div>
        </div>
    );
};

export default UsuarioFormPage;
