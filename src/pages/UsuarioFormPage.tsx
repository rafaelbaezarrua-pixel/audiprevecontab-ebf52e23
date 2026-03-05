import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Shield, ArrowLeft, Save, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const moduleLabels: Record<string, string> = {
    societario: "Societário",
    fiscal: "Fiscal",
    pessoal: "Pessoal",
    certificados: "Certificados",
    procuracoes: "Procurações",
    vencimentos: "Vencimentos",
    parcelamentos: "Parcelamentos",
    recalculos: "Recálculos",
    honorarios: "Honorários",
    licencas: "Licenças",
    certidoes: "Certidões",
};

const UsuarioFormPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        nome: "",
        email: "",
        password: "",
        isAdmin: false,
        modules: {} as Record<string, boolean>
    });

    const handleCreateUser = async () => {
        if (!form.nome.trim() || !form.email.trim() || !form.password.trim()) {
            toast.error("Nome, email e senha são obrigatórios");
            return;
        }

        if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
            toast.error("Senha deve ter pelo menos 8 caracteres, com letra maiúscula e número");
            return;
        }

        setLoading(true);
        try {
            console.log("Chamando Edge Function create-user...");
            const { data, error } = await supabase.functions.invoke("create-user", {
                body: {
                    email: form.email,
                    password: form.password,
                    nome: form.nome,
                    isAdmin: form.isAdmin,
                    modules: form.modules
                },
            });

            if (error) {
                console.error("Erro no invoke da função:", error);
                if (error.message?.includes("Failed to send a request")) {
                    throw new Error("Não foi possível conectar à Edge Function. Verifique se a função 'create-user' foi implantada no Supabase.");
                }
                throw error;
            }

            if (data?.error) throw new Error(data.error);

            toast.success("Usuário criado com sucesso!");
            navigate("/configuracoes");
        } catch (err: any) {
            console.error("Erro detalhado:", err);
            toast.error("Erro: " + err.message);
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
                    className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                    title="Voltar"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-card-foreground">Novo Usuário</h1>
                    <p className="text-sm text-muted-foreground">Cadastre um novo colaborador e defina seus acessos</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                            <User size={18} className="text-primary" /> Informações Básicas
                        </h2>

                        <div>
                            <label className={labelCls}>Nome Completo *</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    placeholder="Nome do colaborador"
                                    value={form.nome}
                                    onChange={e => setForm({ ...form, nome: e.target.value })}
                                    className={inputCls + " pl-11"}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>E-mail *</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="email"
                                    placeholder="exemplo@email.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className={inputCls + " pl-11"}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Senha de Acesso *</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="password"
                                    placeholder="Mín. 8 caracteres, maiúscula e número"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className={inputCls + " pl-11"}
                                />
                            </div>
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
                    <strong>Lembrete:</strong> Ao criar um usuário, ele receberá acesso imediato ao sistema com o e-mail e senha configurados. Certifique-se de que a Edge Function do Supabase foi implantada corretamente para processar este cadastro.
                </p>
            </div>
        </div>
    );
};

export default UsuarioFormPage;
