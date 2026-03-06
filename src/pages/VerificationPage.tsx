import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import logoAudipreve from "@/assets/logo-audipreve.png";

const VerificationPage: React.FC = () => {
    const { user, userData, refreshUserData } = useAuth();
    const navigate = useNavigate();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (userData?.firstAccessDone) {
            navigate("/dashboard", { replace: true });
        } else {
            sendCode();
        }
    }, [userData]);

    const sendCode = async () => {
        if (sending) return;
        setSending(true);
        try {
            const { error } = await supabase.functions.invoke("send-verification-code", {
                body: { action: "send" },
            });
            if (error) throw error;
            toast.success("Código enviado para o seu e-mail!");
        } catch (err: any) {
            toast.error("Erro ao enviar código: " + err.message);
        } finally {
            setSending(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length < 6) {
            toast.error("O código deve ter 6 dígitos");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("send-verification-code", {
                body: { action: "verify", code },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success("Acesso verificado com sucesso!");
            await refreshUserData();
            navigate("/dashboard", { replace: true });
        } catch (err: any) {
            toast.error(err.message === "Código inválido" ? "Código incorreto. Tente novamente." : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-8 space-y-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center">
                    <img src={logoAudipreve} alt="Audipreve" className="w-20 h-20 object-contain mx-auto mb-6" />
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                        <ShieldCheck size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-card-foreground">Verificação de Segurança</h2>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        Como este é seu primeiro acesso, enviamos um código de 6 dígitos para <strong>{user?.email}</strong>.
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground ml-1">Código de Verificação</label>
                        <input
                            type="text"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                            className="w-full text-center text-3xl font-black tracking-[0.5em] h-16 border-2 border-border rounded-xl bg-background focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="000000"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                        style={{ background: "var(--gradient-primary)" }}
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Verificar e Entrar"}
                    </button>
                </form>

                <div className="text-center">
                    <button
                        onClick={sendCode}
                        disabled={sending}
                        className="text-sm font-medium text-primary hover:underline flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                        Não recebeu o código? Reenviar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerificationPage;
