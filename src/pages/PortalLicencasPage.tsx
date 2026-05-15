import React, { useEffect, useState } from "react";
import { formatDateBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollText, FileText, Download, Eye, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PortalLicencasPage: React.FC = () => {
    const { userData } = useAuth();
    const [licencas, setLicencas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLicencas = async () => {
            if (!userData?.empresaId) return;

            const { data, error } = await supabase
                .from("licencas")
                .select("*")
                .eq("empresa_id", userData.empresaId);

            if (error) {
                toast.error("Erro ao carregar licenças");
            } else {
                setLicencas(data || []);
            }
            setLoading(false);
        };

        loadLicencas();
    }, [userData]);

    const calcDias = (data?: string | null) => {
        if (!data) return 999;
        return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
    };

    const licencaLabels: Record<string, string> = {
        alvara: "Alvará de Funcionamento",
        vigilancia_sanitaria: "Vigilância Sanitária",
        corpo_bombeiros: "Corpo de Bombeiros",
        meio_ambiente: "Meio Ambiente"
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <ScrollText size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Licenças Municipais</h1>
                    <p className="text-muted-foreground">Documentação e alvarás da sua empresa</p>
                </div>
            </div>

            {licencas.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <ShieldCheck size={48} className="text-muted-foreground/30 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">Nenhuma licença cadastrada no momento.</p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Sua equipe de contabilidade irá cadastrar as licenças assim que estiverem disponíveis.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {licencas.map((lic) => {
                        const dias = calcDias(lic.vencimento);
                        const isVencendo = dias <= 30 && dias >= 0;
                        const isVencido = dias < 0;

                        return (
                            <Card key={lic.id} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            <FileText size={18} className="text-primary" />
                                            {licencaLabels[lic.tipo_licenca] || lic.tipo_licenca}
                                        </CardTitle>
                                        {lic.status && (
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${lic.status === "definitiva" ? "bg-green-500/10 text-green-500" :
                                                lic.status === "com_vencimento" ? "bg-amber-500/10 text-amber-500" :
                                                    "bg-primary/10 text-primary"
                                                }`}>
                                                {lic.status}
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        {lic.vencimento && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Clock size={14} /> Vencimento:
                                                </span>
                                                <span className={`font-semibold ${isVencido ? "text-destructive" : isVencendo ? "text-amber-500" : ""}`}>
                                                    {formatDateBR(lic.vencimento)}
                                                    {dias !== 999 && ` (${dias}d)`}
                                                </span>
                                            </div>
                                        )}
                                        {lic.numero_processo && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <AlertCircle size={14} /> Processo:
                                                </span>
                                                <span className="font-medium">{lic.numero_processo}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-border/50">
                                        {lic.file_url ? (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 gap-2"
                                                    onClick={() => window.open(lic.file_url, "_blank")}
                                                >
                                                    <Eye size={16} /> Visualizar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="flex-1 gap-2"
                                                    onClick={() => {
                                                        const a = document.createElement("a");
                                                        a.href = lic.file_url;
                                                        a.download = `${licencaLabels[lic.tipo_licenca] || "Licenca"}.pdf`;
                                                        a.target = "_blank";
                                                        a.click();
                                                    }}
                                                >
                                                    <Download size={16} /> Baixar
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="w-full py-2 px-3 rounded-lg bg-muted text-center text-xs text-muted-foreground">
                                                Documento físico não anexado ainda
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PortalLicencasPage;
