import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { Loader2, ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";
import logoAudipreve from "@/assets/logo-audipreve.png";
import ReCAPTCHA from "react-google-recaptcha";
import { toast } from "sonner";

const LoginPage: React.FC = () => {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const RATE_LIMIT_KEY = "admin_login_attempts";
  const BLOCK_TIME_KEY = "admin_login_block";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-in fade-in duration-700">
          <img src={logoAudipreve} alt="Audipreve" className="w-24 h-24 object-contain mx-auto mb-6 drop-shadow-2xl" />
          <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Iniciando Ambiente Seguro</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Rate Limiting Protection (Frontend mitigado)
    const blockedUntilStr = localStorage.getItem(BLOCK_TIME_KEY);
    if (blockedUntilStr) {
      const blockedUntil = parseInt(blockedUntilStr, 10);
      if (Date.now() < blockedUntil) {
        toast.error("Acesso bloqueado temporariamente por múltiplas falhas.");
        setError("Muitas tentativas falhas. Aguarde alguns minutos.");
        return;
      } else {
        localStorage.removeItem(BLOCK_TIME_KEY);
        localStorage.setItem(RATE_LIMIT_KEY, "0");
      }
    }

    const attemptsLocal = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10);
    
    // Ativar Recaptcha após 2 falhas na sessão atual do navegador
    if (attemptsLocal >= 2 && !recaptchaToken) {
      toast.error("Por favor, valide o CAPTCHA de segurança.");
      setError("Validação humana necessária.");
      return;
    }

    setSubmitting(true);
    const startTime = Date.now();

    try {
      await login(email, password);
      // Sucesso: Limpar histórico de falhas
      localStorage.removeItem(RATE_LIMIT_KEY);
      localStorage.removeItem(BLOCK_TIME_KEY);
    } catch (err: any) {
      // Conta Falhas
      const attempts = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10) + 1;
      localStorage.setItem(RATE_LIMIT_KEY, attempts.toString());
      
      if (attempts >= 5) {
        // Bloqueia por 30 minutos
        localStorage.setItem(BLOCK_TIME_KEY, (Date.now() + 30 * 60 * 1000).toString());
        toast.error("Segurança ativada: Múltiplas tentativas falhas detectadas.");
      }

      setError(
        err.message === "Invalid login credentials" || err.message === "Invalid credentials" 
          ? "Credenciais de acesso incorretas" 
          : "Falha na autenticação. Tente novamente."
      );
    } finally {
      // 2. Timing Attack Prevention (Enforce min 1200ms delay)
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }
      setSubmitting(false);
    }
  };

  const attempts = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="bg-card/50 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 relative">
          
          {/* Header Branding */}
          <div className="p-10 pb-6 text-center">
            <div className="relative inline-block mb-8">
               <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
               <img src={logoAudipreve} alt="Audipreve" className="w-24 h-24 object-contain mx-auto relative z-10 drop-shadow-xl" />
            </div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Internal <span className="text-primary">Portal</span></h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-2">Acesso Administrativo Restrito</p>
          </div>

          <div className="px-10 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                  <Mail size={12} className="text-primary" /> Endereço de E-mail
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full h-14 pl-5 pr-5 border border-white/5 rounded-2xl bg-background/50 text-foreground text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all shadow-inner"
                    placeholder="E-mail profissional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Lock size={12} className="text-primary" /> Senha Pessoal
                  </label>
                  <Link to="/esqueci-senha" title="Esqueci minha senha" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors">
                    Esqueci a Senha
                  </Link>
                </div>
                <div className="relative group">
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full h-14 pl-5 pr-5 border border-white/5 rounded-2xl bg-background/50 text-foreground text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all shadow-inner"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Security: ReCaptcha after failures */}
              {attempts >= 2 && (
                <div className="flex justify-center py-4 animate-in zoom-in-95 duration-500">
                  <ReCAPTCHA 
                    sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" 
                    onChange={(token) => setRecaptchaToken(token)}
                    theme="dark"
                  />
                </div>
              )}

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-3 animate-in shake-in duration-500">
                   <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                   <p className="text-[11px] font-black uppercase tracking-widest text-destructive">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (attempts >= 2 && !recaptchaToken)}
                className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>Autenticar Credenciais <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </div>

          <div className="bg-muted/30 px-10 py-5 border-t border-white/5 flex items-center justify-center gap-3">
             <ShieldCheck size={16} className="text-emerald-500" />
             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Sistema de Acesso Criptografado</p>
          </div>
        </div>

        <p className="text-[9px] font-bold text-muted-foreground/40 text-center mt-8 uppercase tracking-[0.3em]">
          © 2026 Audipreve Contabilidade • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
