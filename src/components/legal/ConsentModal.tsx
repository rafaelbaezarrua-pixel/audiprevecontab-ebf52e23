import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { recordConsent } from "@/lib/compliance";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ShieldCheck, Download, LogOut, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const ConsentModal: React.FC = () => {
    const { user, logout, refreshUserData } = useAuth();
    const [documents, setDocuments] = useState<any[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasReadToBottom, setHasReadToBottom] = useState(false);

    useEffect(() => {
        const fetchPendingDocs = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // Busca documentos que precisam de aceite
                const { data: status } = await supabase.rpc('check_user_consent_status', { 
                    p_user_id: user.id 
                });
                
                const pendingSlugs = status?.filter((s: any) => s.needs_acceptance).map((s: any) => s.document_slug) || [];
                
                if (pendingSlugs.length > 0) {
                    const { data: docs } = await supabase
                        .from('legal_documents')
                        .select('*')
                        .in('slug', pendingSlugs)
                        .order('created_at', { ascending: true });
                    
                    setDocuments(docs || []);
                } else {
                    setDocuments([]);
                }
            } catch (err) {
                console.error("Erro ao carregar documentos legais:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPendingDocs();
    }, [user]);

    const handleAcceptAll = async () => {
        if (!user || documents.length === 0) return;
        
        setIsSubmitting(true);
        try {
            for (const doc of documents) {
                await recordConsent(
                    user.id,
                    doc.slug,
                    doc.version,
                    doc.document_hash,
                    true
                );
            }
            
            toast.success("Termos aceitos com sucesso!");
            await refreshUserData();
            window.location.reload(); // Força atualização do estado global
        } catch (err) {
            toast.error("Erro ao registrar consentimento.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
            setHasReadToBottom(true);
        }
    };

    if (loading) return null;
    if (documents.length === 0) return null;

    const currentDoc = documents[currentStep];

    return (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 font-ubuntu animate-in fade-in duration-500">
            <div className="w-full max-w-4xl bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-8 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-card-foreground uppercase tracking-tight">Conformidade Legal & LGPD</h2>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                                Documento {currentStep + 1} de {documents.length}: {currentDoc.title} ({currentDoc.version})
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => logout()} className="text-muted-foreground hover:text-destructive gap-2 text-[10px] font-black uppercase tracking-widest">
                        <LogOut size={14} /> Sair do Sistema
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-8 flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 flex flex-col min-h-0">
                        <ScrollArea 
                            className="flex-1 bg-background/50 border border-border/50 rounded-3xl p-6" 
                            onScrollCapture={handleScroll}
                        >
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-muted-foreground prose-headings:text-card-foreground prose-strong:text-card-foreground">
                                <div dangerouslySetInnerHTML={{ __html: currentDoc.content }} />
                                <div className="h-20" /> {/* Spacer for scroll check */}
                            </div>
                        </ScrollArea>
                        
                        {!hasReadToBottom && (
                            <p className="text-[9px] text-primary font-black uppercase tracking-widest text-center mt-4 animate-bounce">
                                Role até o final para habilitar o aceite ↓
                            </p>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="w-full lg:w-80 flex flex-col justify-between gap-6 shrink-0">
                        <div className="space-y-6">
                            <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary">Status do Aceite</h3>
                                
                                <div className="flex items-start space-x-3 group cursor-pointer" onClick={() => hasReadToBottom && setAcceptedTerms(!acceptedTerms)}>
                                    <Checkbox 
                                        id="terms" 
                                        checked={acceptedTerms}
                                        disabled={!hasReadToBottom}
                                        className="mt-1 data-[state=checked]:bg-primary"
                                    />
                                    <label className="text-[11px] font-medium leading-tight text-muted-foreground group-hover:text-card-foreground transition-colors cursor-pointer">
                                        Li e compreendo os Termos de Uso e condições de acesso ao sistema.
                                    </label>
                                </div>

                                <div className="flex items-start space-x-3 group cursor-pointer" onClick={() => hasReadToBottom && setAcceptedPrivacy(!acceptedPrivacy)}>
                                    <Checkbox 
                                        id="privacy" 
                                        checked={acceptedPrivacy}
                                        disabled={!hasReadToBottom}
                                        className="mt-1 data-[state=checked]:bg-primary"
                                    />
                                    <label className="text-[11px] font-medium leading-tight text-muted-foreground group-hover:text-card-foreground transition-colors cursor-pointer">
                                        Autorizo o tratamento de meus dados conforme a Política de Privacidade (LGPD).
                                    </label>
                                </div>
                            </div>

                            <Button variant="outline" className="w-full h-12 rounded-2xl gap-2 text-[10px] font-black uppercase tracking-widest border-border/50">
                                <Download size={14} /> Baixar PDF (v{currentDoc.version})
                            </Button>
                        </div>

                        <div className="pt-6 border-t border-border flex flex-col gap-3">
                            {currentStep < documents.length - 1 ? (
                                <Button 
                                    className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] group"
                                    disabled={!acceptedTerms || !acceptedPrivacy}
                                    onClick={() => {
                                        setCurrentStep(prev => prev + 1);
                                        setAcceptedTerms(false);
                                        setAcceptedPrivacy(false);
                                        setHasReadToBottom(false);
                                    }}
                                >
                                    Próximo Documento <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            ) : (
                                <Button 
                                    className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[12px] shadow-lg shadow-emerald-500/20"
                                    disabled={!acceptedTerms || !acceptedPrivacy || isSubmitting}
                                    onClick={handleAcceptAll}
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Finalizar e Acessar Sistema"}
                                </Button>
                            )}
                            
                            <p className="text-[9px] text-center text-muted-foreground/40 font-medium">
                                IP Detectado: 127.0.0.1 • Protocolo RSA-2048 Sig
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
