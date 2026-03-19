import { useEffect, useState } from "react";
import { formatDateBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserCircle, Building2, MapPin, Scale, FileSignature, Briefcase, Zap, Save, Lock, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PortalPerfilPage: React.FC = () => {
    const { userData, user } = useAuth();
    const [empresa, setEmpresa] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPass, setChangingPass] = useState(false);

    useEffect(() => {
        const loadEmpresa = async () => {
            if (!userData?.empresaId) return;

            const { data, error } = await supabase
                .from("empresas")
                .select("*")
                .eq("id", userData.empresaId)
                .single();

            if (error) {
                toast.error("Erro ao carregar dados da empresa");
            } else {
                setEmpresa(data);
            }
            setLoading(false);
        };

        loadEmpresa();
    }, [userData]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("As senhas não coincidem!");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setChangingPass(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            toast.error("Erro ao alterar senha: " + error.message);
        } else {
            toast.success("Senha alterada com sucesso!");
            setNewPassword("");
            setConfirmPassword("");
        }
        setChangingPass(false);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    const endereco = empresa?.endereco as any || {};

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <UserCircle size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Perfil da Empresa</h1>
                    <p className="text-muted-foreground">Confira seus dados cadastrais e gerencie sua conta</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
                        <div className="h-2 w-full bg-primary" />
                        <CardHeader>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Building2 size={20} className="text-primary" /> Dados Cadastrais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Razão Social</p>
                                <p className="font-semibold">{empresa?.nome_empresa || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CNPJ</p>
                                <p className="font-semibold">{empresa?.cnpj || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data de Abertura</p>
                                <p className="font-semibold">{empresa?.data_abertura ? formatDateBR(empresa.data_abertura) : "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Porte</p>
                                <p className="font-semibold uppercase">{empresa?.porte_empresa || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Regime Tributário</p>
                                <p className="font-semibold text-primary">{empresa?.regime_tributario?.replace("_", " ").toUpperCase() || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email de Acesso</p>
                                <p className="font-semibold opacity-70">{user?.email}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <MapPin size={20} className="text-primary" /> Endereço
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Logradouro</p>
                                <p className="font-semibold">{endereco.logradouro || "—"}, {endereco.numero || "S/N"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bairro</p>
                                <p className="font-semibold">{endereco.bairro || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cidade/UF</p>
                                <p className="font-semibold">{endereco.cidade || "—"} / {endereco.estado || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CEP</p>
                                <p className="font-semibold">{endereco.cep || "—"}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Security / Sidebar */}
                <div className="space-y-6">
                    <Card className="border-none shadow-md bg-gradient-to-br from-card to-muted/20">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Lock size={18} className="text-primary" /> Alterar Senha
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Nova Senha</label>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="bg-background/50 shadow-inner h-10"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Confirmar Senha</label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="bg-background/50 shadow-inner h-10"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={changingPass}
                                    className="w-full mt-2 font-bold group"
                                >
                                    {changingPass ? "Alterando..." : "Atualizar Senha"}
                                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="p-6 rounded-2xl bg-info/5 border border-info/10 space-y-3">
                        <Zap size={24} className="text-info opacity-30" />
                        <h4 className="font-bold text-sm text-info">Dados Incorretos?</h4>
                        <p className="text-xs text-info/70 leading-relaxed">
                            Se alguma informação cadastral estiver desatualizada, entre em contato via chat para solicitar a alteração.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortalPerfilPage;
