import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useFormHelpers } from "@/hooks/useFormHelpers";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";
import { supabase } from "@/integrations/supabase/client";

const ClientLoginPage: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Rate Limiting Protection (Frontend mitigado)
        const RATE_LIMIT_KEY = "portal_login_attempts";
        const BLOCK_TIME_KEY = "portal_login_block";
        const blockedUntilStr = localStorage.getItem(BLOCK_TIME_KEY);
        if (blockedUntilStr) {
            const blockedUntil = parseInt(blockedUntilStr, 10);
            if (Date.now() < blockedUntil) {
                toast.error("Muitas tentativas falhas. Bloqueio temporário ativo.");
                return;
            } else {
                localStorage.removeItem(BLOCK_TIME_KEY);
                localStorage.setItem(RATE_LIMIT_KEY, "0");
            }
        }

        const attemptsLocalStr = localStorage.getItem(RATE_LIMIT_KEY) || "0";
        const attemptsLocal = parseInt(attemptsLocalStr, 10);
        
        // Ativar Recaptcha após 2 falhas na sessão atual do navegador
        if (attemptsLocal >= 2 && !recaptchaToken) {
            toast.error("Por favor, valide o CAPTCHA de segurança.");
            return;
        }

        setLoading(true);
        const startTime = Date.now();
        let wasSuccess = false;
        let requiresAAL2 = false;

        try {
            await loginAsClient(email, password);
            
            // Verificar status do MFA pós-login
            const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            
            if (mfaError) throw mfaError;

            // Possui fator mas logou apenas de nível 1
            if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
                const { data: factors } = await supabase.auth.mfa.listFactors();
                const totpFactor = factors?.totp?.[0];
                if (totpFactor) {
                   setMfaFactorId(totpFactor.id);
                }
                setRequiresMfa(true);
                requiresAAL2 = true;
            } 
            // MFA não configurado (obrigatório agora)
            else if (mfaData.nextLevel === 'aal1' && mfaData.currentLevel === 'aal1') {
                const { data: factors } = await supabase.auth.mfa.listFactors();
                if (!factors?.totp || factors.totp.length === 0) {
                    const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
                    if (enrollErr) throw enrollErr;
                    
                    setMfaFactorId(enrollData.id);
                    setMfaQrCode(enrollData.totp.qr_code); // SVG Code
                    setMfaSecret(enrollData.totp.secret);
                    setRequiresMfa(true);
                    requiresAAL2 = true;
                    toast.info("Configuração de Segurança Obrigatória exigida.");
                }
            }
            
            if (!requiresAAL2) {
                wasSuccess = true;
            }
        } catch (error: any) {
            // Conta Falhas
            const attempts = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10) + 1;
            localStorage.setItem(RATE_LIMIT_KEY, attempts.toString());
            
            if (attempts >= 5) {
                // Bloqueia por 30 minutos
                localStorage.setItem(BLOCK_TIME_KEY, (Date.now() + 30 * 60 * 1000).toString());
                toast.error("Múltiplas falhas detectadas. Segurança ativada.");
            }
        } finally {
            // 2. Timing Attack Prevention (Enforce min 1000ms delay)
            const elapsed = Date.now() - startTime;
            if (elapsed < 1000) {
                await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
            }

            setLoading(false);

            if (wasSuccess) {
                localStorage.removeItem(RATE_LIMIT_KEY);
                toast.success("Login realizado com sucesso!");
                navigate("/portal");
            } else if (!requiresAAL2) {
                // 3. Email Enumeration Prevention (Mensagem sempre Genérica)
                toast.error("Credenciais inválidas. Verifique seu e-mail e senha.");
            }
        }
    };

    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!mfaFactorId) throw new Error("Fator de autenticação não encontrado");

            const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId: mfaFactorId,
                challengeId: challenge.data.id,
                code: totpCode,
            });

            if (verify.error) throw verify.error;

            toast.success("Segurança valiada com sucesso!");
            localStorage.removeItem("portal_login_attempts");
            navigate("/portal");
        } catch (err: any) {
            toast.error(err.message || "Código TOTP inválido.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl animate-pulse" />

            <Card className="w-full max-w-md border-none shadow-2xl relative z-10 bg-card/50 backdrop-blur-xl">
                <CardHeader className="space-y-4 text-center">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-300">
                            <Building2 size={32} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-3xl font-bold tracking-tight">Portal do Cliente</CardTitle>
                        <p className="text-muted-foreground text-sm">
                            Audipreve Contabilidade - {requiresMfa ? "Segurança Adicional" : "Acesso Restrito"}
                        </p>
                    </div>
                </CardHeader>

                <CardContent>
                    {!requiresMfa ? (
                        <form id="client-login-form" onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Building2 size={14} /> E-mail (Cadastrado na RFB)
                                </label>
                                <Input
                                    type="email"
                                    placeholder="Seu E-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 bg-background/50 border-border/50 focus:border-primary transition-all text-lg font-medium"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Lock size={14} /> Senha de Acesso
                                </label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 bg-background/50 border-border/50 focus:border-primary transition-all"
                                    required
                                />
                            </div>

                            {/* Mostrar ReCaptcha apenas se houverem falhas (Fallback V2) */}
                            {(parseInt(localStorage.getItem("portal_login_attempts") || "0", 10) >= 2) && (
                                <div className="flex justify-center py-2">
                                    <ReCAPTCHA 
                                        sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Dummy Key for V2 Demo (Needs valid env key)
                                        onChange={(token) => setRecaptchaToken(token)}
                                    />
                                </div>
                            )}

                        </form>
                    ) : (
                        <form id="client-mfa-form" onSubmit={handleMfaSubmit} className="space-y-6">
                            {mfaQrCode && (
                                <div className="space-y-4 flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground text-center alert alert-warning">
                                        Escaneie este código QR com um App Autenticador (Google Authenticator, Authy, Microsoft) para ativar o MFA obrigatório da sua conta:
                                    </p>
                                    <div 
                                        className="bg-white p-4 rounded-xl shadow-inner my-2 [&>svg]:w-48 [&>svg]:h-48"
                                        dangerouslySetInnerHTML={{ __html: mfaQrCode }}
                                    />
                                    <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded w-full text-center">
                                        Secret: {mfaSecret}
                                    </p>
                                </div>
                            )}

                            {!mfaQrCode && (
                                <div className="text-center pb-4">
                                    <p className="text-sm text-muted-foreground">Abra seu aplicativo autenticador e digite o código de 6 dígitos gerado.</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Lock size={14} /> Código de Segurança TOTP
                                </label>
                                <Input
                                    type="text"
                                    placeholder="000 000"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    className="h-14 bg-background/50 border-border/50 focus:border-primary transition-all font-mono text-center text-2xl tracking-[0.5em]"
                                    required
                                    autoFocus
                                />
                            </div>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                    <Button
                        form={!requiresMfa ? "client-login-form" : "client-mfa-form"}
                        type="submit"
                        className="w-full h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={loading || (parseInt(localStorage.getItem("portal_login_attempts") || "0", 10) >= 2 && !recaptchaToken && !requiresMfa)}
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>{!requiresMfa ? "Entrar no Portal" : "Verificar Identidade"} <ArrowRight className="ml-2" size={20} /></>
                        )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border/50 pt-4 w-full">
                        <ShieldCheck size={14} className="text-green-500" />
                        Ambiente Seguro e Criptografado
                    </div>
                </CardFooter>
            </Card>

            {/* Footer Branding */}
            <div className="absolute bottom-8 text-center w-full">
                <p className="text-xs text-muted-foreground font-medium opacity-50 uppercase tracking-widest">
                    Desenvolvido por Audipreve Tecnologia
                </p>
            </div>
        </div>
    );
};

export default ClientLoginPage;
