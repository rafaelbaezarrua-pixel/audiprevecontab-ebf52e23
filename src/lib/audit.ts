import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'LOGIN' | 'DOWNLOAD' | 'ACCESS_DENIED';

// Rate limiting para logs de auditoria (previne abuso e flood)
const AUDIT_RATE_LIMIT = {
    maxLogsPerMinute: 60,
    windowMs: 60000,
};

const logTimestamps: number[] = [];

// Validação de dados sensíveis - remove informações críticas antes de logar
const sanitizeForAudit = (data: any, depth = 0): any => {
    if (depth > 10) return '[MAX_DEPTH_EXCEEDED]'; // Previne loops infinitos

    if (data === null || data === undefined) return null;
    if (typeof data === 'boolean' || typeof data === 'number') return data;

    if (typeof data === 'string') {
        // Masking de dados sensíveis
        return data
            .replace(/"cpf"\s*:\s*"[^"]*"/gi, '"cpf":"***"')
            .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"***"')
            .replace(/"senha"\s*:\s*"[^"]*"/gi, '"senha":"***"')
            .replace(/"token"\s*:\s*"[^"]*"/gi, '"token":"***"')
            .replace(/"secret"\s*:\s*"[^"]*"/gi, '"secret":"***"')
            .replace(/"api_key"\s*:\s*"[^"]*"/gi, '"api_key":"***"')
            .slice(0, 50000); // Limite de tamanho
    }

    if (Array.isArray(data)) {
        return data.slice(0, 100).map(item => sanitizeForAudit(item, depth + 1)); // Limite de array
    }

    if (typeof data === 'object') {
        const sanitized: any = {};
        let count = 0;
        for (const [key, value] of Object.entries(data)) {
            if (count >= 50) break; // Limite de chaves
            // Pula campos sensíveis
            if (/^(password|senha|secret|token|api_key|apikey|credential)$/i.test(key)) {
                sanitized[key] = '***';
            } else {
                sanitized[key] = sanitizeForAudit(value, depth + 1);
            }
            count++;
        }
        return sanitized;
    }

    return String(data).slice(0, 1000);
};

// Validação de ação de auditoria
const isValidAction = (action: string): action is AuditAction => {
    const validActions: AuditAction[] = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'LOGIN', 'DOWNLOAD', 'ACCESS_DENIED'];
    return validActions.includes(action as AuditAction);
};

// Validação de nome de tabela (previne SQL injection)
const isValidTableName = (tableName: string): boolean => {
    if (!tableName || typeof tableName !== 'string') return false;
    // Apenas letras, números e underscore, máximo 63 caracteres (limite PostgreSQL)
    return /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(tableName);
};

export const logAction = async (
    userId: string | undefined,
    action: AuditAction,
    tableName: string,
    recordId: string,
    oldData: any = null,
    newData: any = null
) => {
    // Validações de segurança
    if (!userId || typeof userId !== 'string') {
        console.warn('[AUDIT] User ID inválido');
        return;
    }

    if (!isValidAction(action)) {
        console.warn('[AUDIT] Ação inválida:', action);
        return;
    }

    if (!isValidTableName(tableName)) {
        console.warn('[AUDIT] Nome de tabela inválido:', tableName);
        return;
    }

    if (typeof recordId !== 'string' || recordId.length > 500) {
        console.warn('[AUDIT] Record ID inválido');
        return;
    }

    // Rate limiting
    const now = Date.now();
    logTimestamps.push(now);

    // Remove timestamps antigos (fora da janela)
    const windowStart = now - AUDIT_RATE_LIMIT.windowMs;
    while (logTimestamps.length > 0 && logTimestamps[0] < windowStart) {
        logTimestamps.shift();
    }

    // Verifica se excedeu o limite
    if (logTimestamps.length > AUDIT_RATE_LIMIT.maxLogsPerMinute) {
        console.warn('[AUDIT] Rate limit excedido. Log descartado.');
        logTimestamps.pop(); // Remove o timestamp atual
        return;
    }

    try {
        const { error } = await supabase.from('audit_logs' as any).insert([{
            user_id: userId,
            action,
            table_name: tableName,
            record_id: recordId.slice(0, 500),
            old_data: sanitizeForAudit(oldData),
            new_data: sanitizeForAudit(newData),
        }]);

        if (error) {
            console.error('AuditLog Error:', error.message);
        }
    } catch (err) {
        console.error('AuditLog critical error:', err);
    }
};
