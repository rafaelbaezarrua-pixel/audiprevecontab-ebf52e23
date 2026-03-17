import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Utility to sync all active companies from the 'empresas' table
 * to the 'auth.users' and 'profiles' tables as client users.
 */
export const syncCompanyClients = async (onProgress?: (current: number, total: number) => void) => {
    try {
        // 1. Fetch all companies
        const { data: companies, error: empError } = await supabase
            .from("empresas")
            .select("id, nome_empresa, cnpj, email_rfb");

        if (empError) throw empError;
        if (!companies) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Não autenticado");

        let synced = 0;
        let errors = 0;

        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];
            if (onProgress) onProgress(i + 1, companies.length);

            if (!company.cnpj) continue;
            if (!company.email_rfb) {
                console.warn(`Skipping ${company.nome_empresa} - missing email_rfb`);
                continue;
            }

            const cleanCNPJ = company.cnpj.replace(/\D/g, "");
            if (!cleanCNPJ) continue;

            const email = company.email_rfb;
            const password = cleanCNPJ; // Default password is CNPJ

            try {
                const { error } = await supabase.functions.invoke("create-user", {
                    body: {
                        email,
                        nome: company.nome_empresa,
                        password,
                        role: 'client',
                        empresa_id: company.id
                    }
                });

                if (error) {
                    console.error(`Error invoking function for ${company.nome_empresa}:`, error);
                    let msg = error.message;
                    try {
                        const body = await (error as any).context?.json();
                        if (body?.code === "user_already_exists") {
                            synced++; // Consider it as success/synced
                            continue;
                        }
                        if (body?.error) msg = body.error;
                    } catch (e) {
                        // Ignore parsing errors for error body
                    }
                    console.error(`Detail for ${company.nome_empresa}: ${msg}`);
                    errors++;
                } else {
                    synced++;
                }
            } catch (err) {
                console.error(`Fatal error syncing ${company.nome_empresa}:`, err);
                errors++;
            }
        }

        return { synced, errors, total: companies.length };
    } catch (error) {
        console.error("Error syncing clients:", error);
        throw error;
    }
};
