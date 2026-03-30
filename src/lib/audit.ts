import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'LOGIN' | 'DOWNLOAD' | 'ACCESS_DENIED';

export const logAction = async (
    userId: string | undefined,
    action: AuditAction,
    tableName: string,
    recordId: string,
    oldData: any = null,
    newData: any = null
) => {
    if (!userId) return;

    try {
        const { error } = await supabase.from('audit_logs' as any).insert([
            {
                user_id: userId,
                action,
                table_name: tableName,
                record_id: recordId,
                old_data: oldData,
                new_data: newData,
            },
        ]);

        if (error) {
            console.error('AuditLog Error:', error.message);
        }
    } catch (err) {
        console.error('AuditLog critical error:', err);
    }
};
