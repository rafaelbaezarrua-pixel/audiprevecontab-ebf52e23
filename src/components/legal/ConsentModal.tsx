import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface LegalDoc {
  id: string;
  type: 'TERMOS_DE_USO' | 'POLITICA_PRIVACIDADE' | 'TERMO_RESPONSABILIDADE';
  version: string;
  content: string;
}

export const ConsentModal: React.FC = () => {
  const { user } = useAuth();
  const [pendingDocs, setPendingDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedResp, setAcceptedResp] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const checkConsent = async (retryLimit = 2) => {
      try {
        const { data: docs, error: docsError } = await supabase
          .from('legal_documents' as any)
          .select('*')
          .eq('is_active', true);

        if (docsError) {
          console.error('ConsentModal: Erro RPC/Banco:', docsError);
          return;
        }

        if (!docs || docs.length === 0) {
          if (retryLimit > 0) {
            console.log('ConsentModal: Banco vazio, acionando carga de emergência...');
            const { seedLegalDocuments } = await import('@/lib/seed-compliance');
            await seedLegalDocuments();
            return checkConsent(retryLimit - 1);
          }
          return;
        }

        const { data: consents } = await supabase
          .from('user_consents' as any)
          .select('document_id')
          .eq('user_id', user.id);

        const acceptedIds = consents?.map(c => c.document_id) || [];
        const pending = Array.isArray(docs) 
          ? (docs as LegalDoc[]).filter(d => !acceptedIds.includes(d.id))
          : [];
        
        setPendingDocs(pending);
      } catch (error) {
        console.error('ConsentModal: Falha na verificação:', error);
      } finally {
        setLoading(false);
      }
    };

    checkConsent();
  }, [user]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleAccept = async () => {
    if (!acceptedTerms || !acceptedPrivacy || !acceptedResp || !hasScrolledToBottom) {
      toast.error("Por favor, leia e aceite todos os documentos obrigatórios.");
      return;
    }

    try {
      const consentPromises = pendingDocs.map(doc => 
        supabase.from('user_consents' as any).insert({
          user_id: user?.id,
          document_id: doc.id,
          ip_address: 'capture_ip_logic',
          user_agent: navigator.userAgent,
          metodo_aceite: 'CLICK_MODAL_OBLIGATORY'
        })
      );

      await Promise.all(consentPromises);
      
      const { logSecurityAction } = await import('@/lib/compliance');
      await logSecurityAction('CONSENT_GRANTED', { docs: pendingDocs.map(d => d.type) }, user?.id);

      toast.success("Termos aceitos com sucesso!");
      setPendingDocs([]);
    } catch (error) {
      toast.error("Erro ao registrar aceite. Tente novamente.");
    }
  };

  const handleDecline = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
    toast.warning("O acesso ao sistema requer o aceite dos termos jurídicos.");
  };

  if (loading || pendingDocs.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-card border-2 border-primary/20 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">
        
        <div className="p-8 border-b border-border/10 bg-primary/5 rounded-t-2xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Conformidade Legal e Ética</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">LGPD - Lei Federal 13.709/2018 | Sigilo Profissional</p>
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-8 space-y-12 bg-black/[0.02] dark:bg-white/[0.02]"
        >
          {pendingDocs.map(doc => (
            <section key={doc.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-primary uppercase flex items-center gap-2">
                  <FileText size={16} /> {doc.type.replace(/_/g, ' ')}
                </h3>
                <span className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full">{doc.version}</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium border-l-2 border-primary/10 pl-6 text-justify">
                {doc.content}
              </div>
            </section>
          ))}
          
          {!hasScrolledToBottom && (
            <div className="flex items-center justify-center gap-2 py-4 text-amber-500 animate-pulse border border-amber-500/20 bg-amber-500/5 rounded-xl">
               <AlertTriangle size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">Utilize a barra de rolagem até o final para habilitar o aceite</span>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-border/10 bg-card space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <label className="flex items-start gap-3 cursor-pointer group bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-transparent hover:border-primary/20 transition-all">
              <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(c) => setAcceptedTerms(!!c)} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-tight">Termos de Uso</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Objeto e Regras</span>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-transparent hover:border-primary/20 transition-all">
              <Checkbox id="privacy" checked={acceptedPrivacy} onCheckedChange={(c) => setAcceptedPrivacy(!!c)} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-tight">Privacidade (LGPD)</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Tratamento de Dados</span>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-transparent hover:border-primary/20 transition-all">
              <Checkbox id="resp" checked={acceptedResp} onCheckedChange={(c) => setAcceptedResp(!!c)} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-tight">Responsabilidade</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Conduta e Ética</span>
              </div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={handleAccept} 
              disabled={!acceptedTerms || !acceptedPrivacy || !acceptedResp || !hasScrolledToBottom} 
              className="flex-1 h-16 text-[11px] font-black uppercase tracking-widest gap-2 bg-[#4c7045] hover:bg-[#3d5a37] shadow-lg shadow-emerald-900/20"
            >
              <CheckCircle2 size={18} /> Confirmar Ciência e Aceite Jurídico
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDecline} 
              className="h-16 px-8 text-[11px] font-black uppercase tracking-widest text-rose-500 border-rose-500/20"
            >
              Discordar / Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
