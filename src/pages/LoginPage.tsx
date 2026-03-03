import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import logoAudipreve from "@/assets/logo-audipreve.png";

const LoginPage: React.FC = () => {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src={logoAudipreve} alt="Audipreve" className="w-20 h-20 object-contain mx-auto mb-4" />
          <Loader2 className="animate-spin mx-auto text-primary" size={24} />
          <p className="text-muted-foreground mt-3 text-sm">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" ? "Email ou senha inválidos" : err.message || "Erro ao fazer login");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-border">
        <div className="p-8">
          <div className="text-center mb-8">
            <img src={logoAudipreve} alt="Audipreve" className="w-24 h-24 object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-card-foreground">Audipreve</h1>
            <p className="text-sm text-muted-foreground mt-1">Sistema de Controle Contábil</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1.5">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="••••••••" />
            </div>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <button type="submit" disabled={submitting} className="w-full py-3 rounded-lg font-semibold text-primary-foreground transition-all shadow-lg hover:shadow-xl disabled:opacity-50" style={{ background: "var(--gradient-primary)" }}>
              {submitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Entrar no Sistema"}
            </button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-6">Entre em contato com o administrador para criar uma conta</p>
        </div>
        <div className="bg-muted/50 px-8 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">© 2024 Audipreve. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
