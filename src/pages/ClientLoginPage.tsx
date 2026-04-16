import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Building2, Lock, ArrowRight, ShieldCheck, Mail, ShieldAlert, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";
import { supabase } from "@/integrations/supabase/client";
import logoAudipreve from "@/assets/logo-audipreve.png";

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
        <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden font-ubuntu">
            {/* Background elements aligned with global aesthetic */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />

            <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 relative z-10">
                
                {/* Logo Section */}
                <div className="text-center space-y-4">
                    <div className="inline-block relative">
                        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                        <img src={logoAudipreve} alt="Audipreve" className="w-32 h-32 object-contain mx-auto relative z-10 drop-shadow-2xl" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="header-title !text-4xl text-center">Portal <span className="text-primary italic">Cliente</span></h1>
                        <p className="subtitle-premium uppercase tracking-[0.4em] text-[10px] opacity-60 text-center">Audipreve Contabilidade Digital</p>
                    </div>
                </div>

                <div className="card-premium !p-10 !rounded-[2.5rem] border-white/10 shadow-2xl bg-card/60 backdrop-blur-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    
                    <div className="mb-10 text-center">
                        <h2 className="text-xl font-black text-card-foreground uppercase tracking-tight">
                            {requiresMfa ? "Segurança Biométrica" : "Acesso à Área do Cliente"}
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-50 text-center">
                           Conexão Criptografada Ponto-a-Ponto
                        </p>
                    </div>

                    {blockedUntil ? (
                        <div className="space-y-6 text-center py-6 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto shadow-inner">
                                <ShieldAlert size={40} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-black text-card-foreground uppercase tracking-widest text-center">Acesso Temporariamente Suspenso</p>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed text-center">
                                    Detectamos atividades incomuns neste terminal.<br/>
                                    Por motivos de segurança, o acesso foi bloqueado.<br/>
                                    Tente novamente em <span className="text-primary font-bold">{timeLeft} seg</span>.
                                </p>
                            </div>
                        </div>
                    ) : !requiresMfa ? (
                        <form id="client-login-form" onSubmit={handleLogin} className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Mail size={12} /> E-mail de Cadastro
                                </label>
                                <Input
                                    type="email"
                                    placeholder="seu@contato.com.br"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="username"
                                    className="h-14 bg-background/40 border-white/5 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all text-sm font-bold text-card-foreground placeholder:opacity-30"
                                    required
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Lock size={12} /> Senha de Serviço
                                    </label>
                                </div>
                                <Input
                                    type="password"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className="h-14 bg-background/40 border-white/5 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all text-sm font-bold text-card-foreground placeholder:opacity-30"
                                    required
                                />
                            </div>

                            {attempts >= 2 && (
                                <div className="flex justify-center p-2 rounded-2xl bg-white/5 border border-white/10 animate-in slide-in-from-top-4 duration-500">
                                    <ReCAPTCHA 
                                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"} 
                                        theme="dark"
                                        onChange={setRecaptchaToken}
                                    />
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="button-premium w-full h-16 !rounded-2xl !text-[11px] uppercase tracking-[0.3em] font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                                disabled={loading || (attempts >= 2 && !recaptchaToken)}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>Acessar Área Restrita <ArrowRight size={20} /></>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <form id="client-mfa-form" onSubmit={handleMfaSubmit} className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                            {mfaQrCode && (
                                <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col items-center gap-4">
                                     <div className="bg-white p-3 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.1)] [&>svg]:w-44 [&>svg]:h-44" 
                                          dangerouslySetInnerHTML={{ __html: mfaQrCode }} />
                                     <p className="text-[10px] text-center text-primary font-black uppercase tracking-widest leading-relaxed">
                                        Vincule seu dispositivo de segurança gerando o token TOTP.
                                     </p>
                                     <div className="w-full h-px bg-primary/10" />
                                     <p className="text-[9px] font-mono text-muted-foreground/40 break-all select-all">MFA Token: {mfaSecret}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] text-center block w-full">
                                    Código de Segurança Dinâmico
                                </label>
                                <Input
                                    type="text"
                                    placeholder="0 0 0  0 0 0"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    className="h-20 bg-background/40 border-white/5 rounded-3xl focus:ring-4 focus:ring-primary/10 transition-all font-mono text-center text-4xl font-black text-primary tracking-[0.3em] placeholder:opacity-5"
                                    required
                                    autoFocus
                                />
                            </div>

                            <Button
                                type="submit"
                                className="button-premium w-full h-16 !rounded-2xl !text-[11px] uppercase tracking-[0.3em] font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>Verificar Identidade <ArrowRight size={20} /></>
                                )}
                            </Button>
                        </form>
                    )}
                </div>

                <div className="flex flex-col items-center gap-4 pb-10">
                    <div className="flex items-center gap-4 opacity-40">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-white/5 rounded-full shadow-inner">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-card-foreground">SSL Secure</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-white/5 rounded-full shadow-inner">
                            <Fingerprint size={12} className="text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-card-foreground">Anti-Bruteforce</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                        <Link to="/login" className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/80 hover:text-primary transition-all flex items-center gap-2">
                           Acesso Colaborador <ArrowRight size={14} />
                        </Link>
                        <p className="text-[9px] font-bold text-muted-foreground/30 text-center uppercase tracking-[0.3em] mt-4">
                           Audipreve Contabilidade Digital © {new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientLoginPage;
