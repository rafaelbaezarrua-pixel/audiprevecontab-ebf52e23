import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Fingerprint, Mail, ArrowLeft, AlertCircle, ShieldCheck, ArrowRight } from "lucide-react";
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
            toast.success("Link de recuperação enviado!");
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden font-ubuntu">
            {/* Dynamic Background Orbs */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />

            <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 relative z-10">
                {/* Logo & Header */}
                <div className="text-center space-y-4">
                    <div className="inline-block relative">
                        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                        <img src={logoAudipreve} alt="Audipreve" className="w-24 h-24 object-contain mx-auto relative z-10 drop-shadow-2xl" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="header-title !text-3xl text-center">Recuperar <span className="text-primary">Acesso</span></h1>
                        <p className="subtitle-premium uppercase tracking-[0.3em] text-[9px] opacity-60 text-center">Audipreve Contabilidade Digital</p>
                    </div>
                </div>

                <div className="card-premium !p-10 !rounded-[2.5rem] border-white/10 shadow-2xl bg-card/60 backdrop-blur-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    {success ? (
                        <div className="text-center space-y-8 py-4 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                <Mail size={40} />
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-xl font-black text-card-foreground uppercase tracking-tight">Verifique seu E-mail</h2>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    Enviamos instruções de segurança para <strong>{email}</strong>.<br/>
                                    Confira sua caixa de entrada e spam.
                                </p>
                            </div>
                            <Link to="/login" className="button-premium w-full h-14 !rounded-2xl flex items-center justify-center gap-2 group">
                                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                                Voltar ao Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="mb-4 text-center">
                                <p className="text-xs text-muted-foreground font-medium">Validaremos seu CPF e e-mail antes de enviar o link para seu e-mail cadastrado.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <Fingerprint size={12} /> CPF do Titular
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={e => setCpf(maskCPF(e.target.value))}
                                        autoComplete="username"
                                        required
                                        className="w-full h-14 px-6 border border-white/5 rounded-2xl bg-background/40 text-sm font-bold text-card-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all shadow-inner"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <Mail size={12} /> E-mail de Recuperação
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="seu@contato.com.br"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                        className="w-full h-14 px-6 border border-white/5 rounded-2xl bg-background/40 text-sm font-bold text-card-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-center gap-3 animate-in shake-in duration-500">
                                    <AlertCircle size={16} className="text-destructive" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-destructive">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="button-premium w-full h-16 !rounded-2xl !text-[11px] uppercase tracking-[0.3em] font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>Solicitar Link Seguro <ArrowRight size={20} /></>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-muted-foreground/40 text-[9px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2 text-emerald-500/60">
                            <ShieldCheck size={14} />
                            <span>Identidade Validada via RPC</span>
                        </div>
                        <Link to="/login" className="hover:text-primary transition-colors flex items-center gap-1">
                            <ArrowLeft size={10} /> Voltar
                        </Link>
                    </div>
                </div>

                <p className="text-[9px] font-bold text-muted-foreground/30 text-center uppercase tracking-[0.3em]">
                    Audipreve Contabilidade • Proteção de Dados e Privacidade
                </p>
            </div>
        </div>
    );
};

export default EsqueciSenhaPage;
