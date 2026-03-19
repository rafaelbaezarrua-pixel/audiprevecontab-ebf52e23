import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarClock, ShieldAlert, History, ArrowRight, Building2, UserCircle, MapPin, Scale, FileSignature, Briefcase, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const PortalVencimentosPage: React.FC = () => {
    const { userData } = useAuth();
    const [vencimentos, setVencimentos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadVencimentos = async () => {
            if (!userData?.empresaId) return;

            const results = [];

            // 1. Licenças
            const { data: lics } = await supabase.from("licencas").select("*").eq("empresa_id", userData.empresaId).not("vencimento", "is", null);
            if (lics) results.push(...lics.map(l => ({ tipo: "Licença", titulo: l.tipo_licenca, data: l.vencimento, id: l.id })));

            // 2. Certidões
            const { data: certs } = await supabase.from("certidoes").select("*").eq("empresa_id", userData.empresaId).not("vencimento", "is", null);
            if (certs) results.push(...certs.map(c => ({ tipo: "Certidão", titulo: c.tipo_certidao, data: c.vencimento, id: c.id })));

            // 3. Certificados Digitais
            const { data: digi } = await supabase.from("certificados_digitais").select("*").eq("empresa_id", userData.empresaId).not("data_vencimento", "is", null);
            if (digi) results.push(...digi.map(d => ({ tipo: "Certificado Digital", titulo: "e-CNPJ / e-CPF", data: d.data_vencimento, id: d.id })));

            setVencimentos(results.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()));
            setLoading(false);
        };

        loadVencimentos();
    }, [userData]);

    const calcDias = (data: string) => Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner">
                    <CalendarClock size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Próximos Vencimentos</h1>
                    <p className="text-muted-foreground">Fique atento aos prazos e renovações</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {vencimentos.length === 0 ? (
                        <Card className="bg-muted/10 border-dashed">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                Nenhum vencimento registrado para os próximos períodos.
                            </CardContent>
                        </Card>
                    ) : (
                        vencimentos.map((v, i) => {
                            const dias = calcDias(v.data);
                            const isVencido = dias < 0;
                            const isCritico = dias <= 7 && dias >= 0;

                            return (
                                <div key={i} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isVencido ? "bg-destructive/10 text-destructive" :
                                            isCritico ? "bg-amber-500/10 text-amber-500" :
                                                "bg-primary/10 text-primary"
                                            }`}>
                                            {isVencido ? <ShieldAlert size={20} /> : <History size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{v.tipo}</p>
                                            <p className="font-bold text-card-foreground group-hover:text-primary transition-colors">{v.titulo}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${isVencido ? "text-destructive" : isCritico ? "text-amber-500" : "text-card-foreground"}`}>
                                            {formatDateBR(v.data)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isVencido ? `Vencido há ${Math.abs(dias)} dias` : `${dias} dias restantes`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ShieldAlert size={16} className="text-primary" /> Sugestões de Renovação
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-4 text-muted-foreground leading-relaxed">
                            <p>Recomendamos iniciar o processo de renovação de licenças municipais com pelo menos <strong>45 dias</strong> de antecedência.</p>
                            <p>Certificados digitais tipo A1 expiram em 1 ano. Entre em contato para agendar a renovação.</p>
                            <ArrowRight size={24} className="text-primary opacity-20 ml-auto" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PortalVencimentosPage;
