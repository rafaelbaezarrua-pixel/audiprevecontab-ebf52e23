import { supabase } from "@/integrations/supabase/client";
import { AuditAction, logAction } from "./audit";

/**
 * LGPD - Gestão de Consentimento
 * Verifica se o usuário precisa aceitar novas versões dos termos
 */
export const checkConsentRequirement = async (userId: string) => {
    try {
        const { data, error } = await supabase.rpc('check_user_consent_status', { 
            p_user_id: userId 
        });

        if (error) throw error;
        
        // Se houver qualquer documento que necessite aceitação
        return data.some((d: any) => d.needs_acceptance);
    } catch (err) {
        console.error("[COMPLIANCE] Error checking consent:", err);
        return false;
    }
};

/**
 * Registra o aceite de um documento legal
 */
export const recordConsent = async (
    userId: string,
    documentSlug: string,
    version: string,
    documentHash: string,
    accepted: boolean
) => {
    try {
        // Busca o ID do documento atual
        const { data: doc } = await supabase
            .from('legal_documents')
            .select('id')
            .eq('slug', documentSlug)
            .eq('version', version)
            .single();

        if (!doc) throw new Error("Documento não encontrado");

        const { error } = await supabase.from('user_consents').insert({
            user_id: userId,
            document_id: doc.id,
            version: version,
            document_hash: documentHash,
            accepted: accepted,
            metodo_aceite: 'web_click_wrap',
            ip_address: '127.0.0.1', // Em produção, capturar do header
            user_agent: navigator.userAgent
        });

        if (error) throw error;

        // Log de auditoria para o aceite
        await logAction(
            userId,
            'EDIT',
            'user_consents',
            userId,
            null,
            { document: documentSlug, version, accepted }
        );

        return true;
    } catch (err) {
        console.error("[COMPLIANCE] Error recording consent:", err);
        return false;
    }
};

/**
 * Assinatura Digital de Logs (SHA-256 + HMAC/RSA simulado no client por enquanto)
 * Em um cenário real de Node.js, isso usaria a chave privada do servidor.
 */
export const signAuditLog = async (logId: string, content: string) => {
    // Isso deve ser feito preferencialmente no backend (Edge Functions)
    // para garantir que a chave privada não vaze para o frontend.
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    await supabase
        .from('audit_logs')
        .update({ integrity_hash: hashHex } as any)
        .eq('id', logId);
};
