import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Fingerprint, Mail, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import logoAudipreve from "@/assets/logo-audipreve.png";
import { maskCPF } from "@/lib/utils";


const EsqueciSenhaPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [cpf, setCpf] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // 1. Verificar usando a função RPC segura que ignora RLS (lê perfis e auth anonimamente de forma controlada)
            const { data: isMatch, error: matchError } = await supabase.rpc('check_cpf_email_match', {
                p_cpf: cpf,
                p_email: email
            });

            if (matchError || !isMatch) {
                throw new Error("CPF não encontrado ou e-mail divergente do cadastro.");
            }

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/reset-password",
            });

            if (resetError) throw resetError;

            setSuccess(true);
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
                        <Mail size={32} />
                    </div>
                    <h2 className="text-2xl font-bold">Verifique seu E-mail</h2>
                    <p className="text-muted-foreground">
                        Enviamos um link de recuperação para <strong>{email}</strong>. Por favor, verifique sua caixa de entrada e spam.
                    </p>
                    <Link to="/login" className="block w-full py-3 rounded-xl font-bold bg-muted hover:bg-muted/80 transition-all">
                        Voltar para o Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-8 space-y-8">
                <div className="text-center">
                    <img src={logoAudipreve} alt="Audipreve" className="w-20 h-20 object-contain mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-card-foreground">Recuperar Senha</h2>
                    <p className="text-muted-foreground mt-2 text-sm">Informe seu CPF e e-mail cadastrados.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">CPF</label>
                            <div className="relative">
                                <Fingerprint size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="000.000.000-00"
                                    value={cpf}
                                    onChange={e => setCpf(maskCPF(e.target.value))}

                                    required
                                    className="w-full pl-11 pr-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">E-mail Cadastrado</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
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
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Enviar Link de Recuperação"}
                    </button>
                </form>

                <div className="text-center">
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft size={16} /> Voltar para o Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default EsqueciSenhaPage;
