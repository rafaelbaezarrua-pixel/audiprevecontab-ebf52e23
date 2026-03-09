import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import logoAudipreve from "@/assets/logo-audipreve.png";

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Verificar se há erro na URL (ex: link expirado)
        const hash = window.location.hash;
        if (hash && hash.includes("error_description")) {
            const params = new URLSearchParams(hash.substring(1));
            const errorDesc = params.get("error_description");
            if (errorDesc) {
                setError(decodeURIComponent(errorDesc).replace(/\+/g, ' '));
            }
        }

        // Verificar se chegamos aqui via link de reset
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event !== "PASSWORD_RECOVERY") {
                // Se não for evento de recuperação, e não tiver sessão, testar o que fazer
                // Não forçamos redirect pra mostrar o erro primeiro
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("A senha deve ter pelo menos 8 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            setSuccess(true);
            toast.success("Senha alterada com sucesso!");
            setTimeout(() => navigate("/login"), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold">Senha Alterada!</h2>
                    <p className="text-muted-foreground">
                        Sua senha foi redefinida com sucesso. Você será redirecionado para o login em instantes.
                    </p>
                    <button onClick={() => navigate("/login")} className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground transition-all">
                        Ir para o Login Agora
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-8 space-y-8 animate-fade-in">
                <div className="text-center">
                    <img src={logoAudipreve} alt="Audipreve" className="w-20 h-20 object-contain mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-card-foreground">Nova Senha</h2>
                    <p className="text-muted-foreground mt-2 text-sm">Defina sua nova senha de acesso.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">Nova Senha</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="password"
                                    placeholder="********"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">Confirmar Senha</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="password"
                                    placeholder="********"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                        style={{ background: "var(--gradient-primary)" }}
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Redefinir Senha"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
