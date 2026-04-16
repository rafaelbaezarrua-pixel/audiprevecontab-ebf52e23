import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { Loader2, ShieldCheck, Lock, Mail, ArrowRight, ShieldAlert } from "lucide-react";
import logoAudipreve from "@/assets/logo-audipreve.png";
import ReCAPTCHA from "react-google-recaptcha";
import { toast } from "sonner";

const LoginPage: React.FC = () => {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Security States
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const RATE_LIMIT_KEY = "admin_login_attempts";
  const BLOCK_TIME_KEY = "admin_login_block";

  // Initialize security states
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

  // Countdown timer
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-ubuntu">
        <div className="text-center animate-in fade-in duration-700">
          <img src={logoAudipreve} alt="Audipreve" className="w-24 h-24 object-contain mx-auto mb-8 drop-shadow-2xl" />
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Autenticando Protocolos</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (blockedUntil) {
      toast.error(`Acesso bloqueado. Aguarde ${timeLeft}s.`);
      return;
    }

    if (attempts >= 2 && !recaptchaToken) {
      toast.warning("Validação humana requerida.");
      return;
    }

    setSubmitting(true);
    const startTime = Date.now();

    try {
      await login(email, password);
      localStorage.removeItem(RATE_LIMIT_KEY);
      localStorage.removeItem(BLOCK_TIME_KEY);
      toast.success("Bem-vindo de volta!");
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem(RATE_LIMIT_KEY, newAttempts.toString());

      if (newAttempts >= 5) {
        const blockTime = Date.now() + 30 * 60 * 1000;
        setBlockedUntil(blockTime);
        localStorage.setItem(BLOCK_TIME_KEY, blockTime.toString());
        toast.error("Segurança ativada: Múltiplas tentativas falhas.");
      }

      setError(
        err.message?.includes("Invalid login credentials")
          ? "Usuário ou senha inválidos."
          : "Falha na comunicação com servidor seguro."
      );
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) await new Promise(r => setTimeout(r, 1200 - elapsed));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden font-ubuntu text-foreground">
      {/* Dynamic System Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 relative z-10">

        {/* Logo Section */}
        <div className="text-center space-y-4">
          <div className="inline-block relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
            <img src={logoAudipreve} alt="Audipreve" className="w-32 h-32 object-contain mx-auto relative z-10 drop-shadow-2xl" />
          </div>
          <div className="space-y-1">
            <h1 className="header-title !text-4xl text-center">Audipreve <span className="text-primary">Contabilidade</span></h1>
            <p className="subtitle-premium uppercase tracking-[0.4em] text-[10px] opacity-60">Sistema de Gestão</p>
          </div>
        </div>

        <div className="card-premium !p-10 !rounded-[2.5rem] border-white/10 shadow-2xl bg-card/60 backdrop-blur-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="mb-10 text-center">
            <h2 className="text-xl font-black text-card-foreground uppercase tracking-tight">Portal <span className="text-primary">Administrativo</span></h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-50">Ambiente Restrito — Protocolo TLS 1.3</p>
          </div>

          {blockedUntil ? (
            <div className="space-y-6 text-center py-6 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto shadow-inner">
                <ShieldAlert size={40} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-black text-card-foreground uppercase tracking-widest">Acesso Temporariamente Suspenso</p>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Múltiplas falhas detectadas. Por segurança, este terminal foi bloqueado.<br />
                  Tente novamente em <span className="text-primary font-bold">{timeLeft} seg</span>.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1 flex items-center gap-2">
                  <Mail size={12} /> ID de Usuário (E-mail)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-14 px-6 border border-white/5 rounded-2xl bg-background/40 text-sm font-bold text-card-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all shadow-inner"
                  placeholder="exemplo@audipreve.com.br"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <Lock size={12} /> Credencial Secreta
                  </label>
                  <Link to="/esqueci-senha" title="Redefinir acesso" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                    Esqueceu a senha?
                  </Link>
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full h-14 px-6 border border-white/5 rounded-2xl bg-background/40 text-sm font-bold text-card-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {attempts >= 2 && (
                <div className="flex justify-center py-2 animate-in slide-in-from-top-4 duration-500">
                  <div className="p-2 bg-white/5 rounded-2xl border border-white/10">
                    <ReCAPTCHA
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                      onChange={setRecaptchaToken}
                      theme="dark"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-center gap-3 animate-in shake-in duration-500">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-destructive">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (attempts >= 2 && !recaptchaToken)}
                className="button-premium w-full h-16 !rounded-2xl !text-[11px] uppercase tracking-[0.3em] font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>Autenticar no Sistema <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          )}

          <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-muted-foreground/40">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500/60" />
              <span className="text-[9px] font-black uppercase tracking-widest">Acesso Seguro</span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest">v2.4.0</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <Link to="/portal" className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/80 hover:text-primary transition-all flex items-center gap-2 hover:gap-3">
            Portal do Cliente <ArrowRight size={14} />
          </Link>
          <p className="text-[9px] font-bold text-muted-foreground/30 text-center uppercase tracking-[0.3em]">
            Audipreve Contabilidade • Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
