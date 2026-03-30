import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useFormHelpers } from "@/hooks/useFormHelpers";
import { toast } from "sonner";

const ClientLoginPage: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { loginAsClient } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await loginAsClient(email, password);
            toast.success("Login realizado com sucesso!");
            navigate("/portal");
        } catch (error: any) {
            toast.error(error.message || "Erro ao realizar login.");
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
                            Audipreve Contabilidade - Acesso Restrito
                        </p>
                    </div>
                </CardHeader>

                <CardContent>
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
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                    <Button
                        form="client-login-form"
                        type="submit"
                        className="w-full h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>Entrar no Portal <ArrowRight className="ml-2" size={20} /></>
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
