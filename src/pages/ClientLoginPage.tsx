import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, ArrowRight, ShieldCheck, Mail, ShieldAlert, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";
import { supabase } from "@/integrations/supabase/client";

const ClientLoginPage: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Security & Block States
    const [attempts, setAttempts] = useState(0);
    const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    
    // MFA States
    const [requiresMfa, setRequiresMfa] = useState(false);
    const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
    const [mfaSecret, setMfaSecret] = useState<string | null>(null);
    const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState("");
    
    // Captcha States
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

    const { loginAsClient } = useAuth();
    const navigate = useNavigate();

    const RATE_LIMIT_KEY = "portal_login_attempts";
    const BLOCK_TIME_KEY = "portal_login_block";

    // Initialize security states from localStorage
    useEffect(() => {
        const storedAttempts = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10);
        const storedBlock = localStorage.getItem(BLOCK_TIME_KEY);
        
        setAttempts(storedAttempts);
        
        if (storedBlock) {
            const blockTime = parseInt(storedBlock, 10);
            if (Date.now() < blockTime) {
                setBlockedUntil(blockTime);
                setTimeLeft(Math.ceil((blockTime - Date.now()) / 1000));
            } else {
                localStorage.removeItem(BLOCK_TIME_KEY);
                localStorage.setItem(RATE_LIMIT_KEY, "0");
                setAttempts(0);
            }
        }
    }, []);

    // Countdown Timer for Lockout
    useEffect(() => {
        if (!blockedUntil) return;

        const interval = setInterval(() => {
            const remaining = Math.ceil((blockedUntil - Date.now()) / 1000);
            if (remaining <= 0) {
                setBlockedUntil(null);
                localStorage.removeItem(BLOCK_TIME_KEY);
                localStorage.setItem(RATE_LIMIT_KEY, "0");
                setAttempts(0);
                clearInterval(interval);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [blockedUntil]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if blocked
        if (blockedUntil && Date.now() < blockedUntil) {
            toast.error(`Portal bloqueado. Tente novamente em ${timeLeft}s.`);
            return;
        }

        // Check for captcha
        if (attempts >= 2 && !recaptchaToken) {
            toast.warning("Validação de CAPTCHA requerida.");
            return;
        }

        setLoading(true);
        const startTime = Date.now();
        let wasSuccess = false;
        let requiresAAL2 = false;

        try {
            await loginAsClient(email, password);
            
            // Check for MFA requirement
            const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            
            if (mfaError) throw mfaError;

            if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
                const { data: factors } = await supabase.auth.mfa.listFactors();
                const totpFactor = factors?.totp?.[0];
                if (totpFactor) {
                   setMfaFactorId(totpFactor.id);
                }
                setRequiresMfa(true);
                requiresAAL2 = true;
            } 
            else if (mfaData.nextLevel === 'aal1' && mfaData.currentLevel === 'aal1') {
                const { data: factors } = await supabase.auth.mfa.listFactors();
                if (!factors?.totp || factors.totp.length === 0) {
                    const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
                    if (enrollErr) throw enrollErr;
                    
                    setMfaFactorId(enrollData.id);
                    setMfaQrCode(enrollData.totp.qr_code);
                    setMfaSecret(enrollData.totp.secret);
                    setRequiresMfa(true);
                    requiresAAL2 = true;
                    toast.info("Configuração de MFA obrigatória para clientes.");
                }
            }
            
            if (!requiresAAL2) {
                wasSuccess = true;
                localStorage.setItem(RATE_LIMIT_KEY, "0");
                localStorage.removeItem(BLOCK_TIME_KEY);
            }
        } catch (error: any) {
            const newAttempts = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10) + 1;
            setAttempts(newAttempts);
            localStorage.setItem(RATE_LIMIT_KEY, newAttempts.toString());
            
            if (newAttempts >= 5) {
                const blockTime = Date.now() + 15 * 60 * 1000; // 15 min lock
                setBlockedUntil(blockTime);
                localStorage.setItem(BLOCK_TIME_KEY, blockTime.toString());
                toast.error("Portal bloqueado por múltiplas tentativas falhas.");
            }
            toast.error("Credenciais inválidas. Tente novamente.");
        } finally {
            // Enforce timing delay
            const elapsed = Date.now() - startTime;
            if (elapsed < 1200) await new Promise(r => setTimeout(r, 1200 - elapsed));

            setLoading(false);

            if (wasSuccess) {
                toast.success("Bem-vindo ao Portal!");
                navigate("/portal");
            }
        }
    };

    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const startTime = Date.now();

        try {
            if (!mfaFactorId) throw new Error("Erro no fator de segurança.");

            const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId: mfaFactorId,
                challengeId: challenge.data.id,
                code: totpCode,
            });

            if (verify.error) throw verify.error;

            // Clear security state on full success
            localStorage.setItem(RATE_LIMIT_KEY, "0");
            localStorage.removeItem(BLOCK_TIME_KEY);
            
            toast.success("Autenticação finalizada!");
            navigate("/portal");
        } catch (err: any) {
            toast.error(err.message || "Código inválido.");
        } finally {
            const elapsed = Date.now() - startTime;
            if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden font-ubuntu">
            {/* Background elements aligned with global aesthetic */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />

            <Card className="w-full max-w-md border-border/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative z-10 bg-[#0c0c0c]/80 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="space-y-6 text-center pt-10 pb-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 group transition-all duration-500 hover:scale-110">
                            <Building2 size={40} className="group-hover:rotate-12 transition-transform" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-3xl font-black tracking-tight text-white uppercase italic">
                            Portal <span className="text-primary">Cliente</span>
                        </CardTitle>
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] opacity-60">
                            {requiresMfa ? "Validação Biométrica" : "Gestão Contábil Segura"}
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="px-8 pb-8">
                    {blockedUntil ? (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-3xl p-8 text-center space-y-4 animate-in zoom-in-95 duration-300">
                             <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mx-auto">
                                <ShieldAlert size={32} />
                             </div>
                             <div className="space-y-1">
                                <p className="text-sm font-black text-destructive uppercase tracking-widest">Acesso Suspenso</p>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    Detectamos atividades incomuns. Por segurança, o acesso está bloqueado temporariamente.
                                </p>
                             </div>
                             <div className="pt-2">
                                <span className="px-6 py-2 bg-destructive/20 rounded-full text-destructive text-sm font-black font-mono">
                                    00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}s
                                </span>
                             </div>
                        </div>
                    ) : !requiresMfa ? (
                        <form id="client-login-form" onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Mail size={12} /> E-mail (RFB)
                                </label>
                                <div className="relative group">
                                    <Input
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold text-white placeholder:text-white/20 pl-4"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Lock size={12} /> Senha Privada
                                </label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold text-white placeholder:text-white/20 pl-4"
                                    required
                                />
                            </div>

                            {attempts >= 2 && (
                                <div className="flex justify-center p-2 rounded-2xl bg-white/5 border border-white/10">
                                    <ReCAPTCHA 
                                        sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" 
                                        theme="dark"
                                        onChange={setRecaptchaToken}
                                    />
                                </div>
                            )}
                        </form>
                    ) : (
                        <form id="client-mfa-form" onSubmit={handleMfaSubmit} className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                            {mfaQrCode && (
                                <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col items-center gap-4">
                                     <div className="bg-white p-3 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.1)] [&>svg]:w-44 [&>svg]:h-44" 
                                          dangerouslySetInnerHTML={{ __html: mfaQrCode }} />
                                     <p className="text-[10px] text-center text-primary font-black uppercase tracking-widest leading-relaxed">
                                        Escaneie para ativar seu dispositivo de segurança de 2 fatores (TOTP).
                                     </p>
                                     <div className="w-full h-px bg-primary/10" />
                                     <p className="text-[9px] font-mono text-white/40 break-all select-all">Secret: {mfaSecret}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] text-center block w-full">
                                    Digite o código gerado no App
                                </label>
                                <Input
                                    type="text"
                                    placeholder="0 0 0 - 0 0 0"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    className="h-20 bg-white/5 border-white/10 rounded-3xl focus:ring-2 focus:ring-primary/20 transition-all font-mono text-center text-4xl font-black text-primary tracking-[0.3em] pl-6 placeholder:text-white/5"
                                    required
                                    autoFocus
                                />
                            </div>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="px-8 pb-10 flex flex-col gap-6">
                    {!blockedUntil && (
                        <Button
                            form={!requiresMfa ? "client-login-form" : "client-mfa-form"}
                            type="submit"
                            className="w-full h-16 text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 group overflow-hidden relative"
                            disabled={loading || (attempts >= 2 && !recaptchaToken && !requiresMfa)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 opacity-100 group-hover:opacity-90 transition-opacity" />
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {requiresMfa ? "AUTENTICAR DISPOSITIVO" : "ENTRAR NO PORTAL"}
                                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                                    </>
                                )}
                            </div>
                        </Button>
                    )}

                    <div className="flex flex-col items-center gap-3 w-full">
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest opacity-80 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                            <ShieldCheck size={14} />
                            SSL 256-BIT ENCRYPTED
                        </div>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-tighter">
                            Audipreve Contábil © {new Date().getFullYear()} - Todos os direitos reservados
                        </p>
                    </div>
                </CardFooter>
            </Card>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-20 hover:opacity-100 transition-opacity cursor-default">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                 <p className="text-[10px] text-white font-black uppercase tracking-[0.5em]">AUDIPREVE SECURITY STACK</p>
                 <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
        </div>
    );
};

export default ClientLoginPage;
