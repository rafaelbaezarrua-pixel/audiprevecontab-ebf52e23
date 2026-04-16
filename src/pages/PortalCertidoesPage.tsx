import React, { useEffect, useState } from "react";
import { formatDateBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileBadge, FileText, Download, Eye, Clock, ShieldCheck, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PortalCertidoesPage: React.FC = () => {
    const { userData } = useAuth();
    const [certidoes, setCertidoes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const loadCertidoes = async () => {
            if (!userData?.empresaId) return;

            const { data, error } = await supabase
                .from("certidoes")
                .select("*")
                .eq("empresa_id", userData.empresaId);

            if (error) {
                toast.error("Erro ao carregar certidões");
            } else {
                setCertidoes(data || []);
            }
            setLoading(false);
        };

        loadCertidoes();
    }, [userData]);

    const filtered = certidoes.filter(c =>
        c.tipo_certidao?.toLowerCase().includes(search.toLowerCase())
    );

    const calcDias = (data?: string | null) => {
        if (!data) return 999;
        return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <FileBadge size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Certidões Negativas (CND)</h1>
                        <p className="text-muted-foreground">Regularidade fiscal da sua empresa</p>
                    </div>
                </div>

                <div className="relative max-w-xs w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar certidão..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-card/50"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <ShieldCheck size={48} className="text-muted-foreground/30 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">
                            {search ? "Nenhuma certidão corresponde à sua busca." : "Nenhuma certidão anexada no momento."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((cert) => {
                        const dias = calcDias(cert.vencimento);
                        const isVencendo = dias <= 30 && dias >= 0;
                        const isVencido = dias < 0;

                        return (
                            <Card key={cert.id} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-2 border-b border-border/10 mb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <FileText size={16} className="text-primary" />
                                            {cert.tipo_certidao}
                                        </CardTitle>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isVencido ? "bg-destructive/10 text-destructive" :
                                            isVencendo ? "bg-amber-500/10 text-amber-500" :
                                                "bg-green-500/10 text-green-500"
                                            }`}>
                                            {isVencido ? "Vencida" : isVencendo ? "A Vencer" : "Válida"}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground flex items-center gap-1">
                                                <Clock size={12} /> Validade:
                                            </span>
                                            <span className={`font-semibold ${isVencido ? "text-destructive" : isVencendo ? "text-amber-500" : ""}`}>
                                                {cert.vencimento ? formatDateBR(cert.vencimento) : "Indeterminada"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-border/50">
                                        {cert.arquivo_url ? (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex-1 gap-2 text-xs"
                                                    onClick={() => window.open(cert.arquivo_url, "_blank")}
                                                >
                                                    <Eye size={14} /> Ver
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="flex-1 gap-2 text-xs"
                                                    onClick={() => {
                                                        const a = document.createElement("a");
                                                        a.href = cert.arquivo_url;
                                                        a.download = `${cert.tipo_certidao}.pdf`;
                                                        a.target = "_blank";
                                                        a.click();
                                                    }}
                                                >
                                                    <Download size={14} /> Baixar
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="w-full py-2 px-3 rounded-lg bg-muted text-center text-[10px] text-muted-foreground">
                                                Documento não anexado pela contabilidade
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

export default PortalCertidoesPage;
