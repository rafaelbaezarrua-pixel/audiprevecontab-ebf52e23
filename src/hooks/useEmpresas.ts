import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useEmpresas = (moduloId: string) => {
    const { user } = useAuth();
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchEmpresas = async () => {
            setLoading(true);
            try {
                if (!user) return;

                let query = supabase.from("empresas").select("*").order("nome_empresa");

                if (moduloId && moduloId !== "declaracoes_mensais") {
                    query = query.contains("modulos_ativos", [moduloId]);
                }

                const { data: emps, error: empsError } = await query;

                if (empsError) throw empsError;
                if (!emps) {
                    if (mounted) { setEmpresas([]); setLoading(false); }
                    return;
                }

                // 2. Fetch specific access records for the current user
                const { data: acessos } = await supabase
                    .from("empresa_acessos")
                    .select("empresa_id, modulos_permitidos")
                    .eq("user_id", user.id);

                const acessosMap = new Map<string, string[]>();
                if (acessos) {
                    acessos.forEach((a) => {
                        acessosMap.set(a.empresa_id, a.modulos_permitidos);
                    });
                }

                // 3. Filter the companies
                const filtered = emps.filter((emp) => {
                    const modulosPermitidos = acessosMap.get(emp.id);
                    // If no row exists in empresa_acessos for this user, they have full access (return true)
                    // If row exists, check if modulos_permitidos includes the current moduloId
                    if (!modulosPermitidos) return true;
                    return modulosPermitidos.includes(moduloId);
                });

                if (mounted) {
                    setEmpresas(filtered);
                }
            } catch (err) {
                console.error("Error fetching empresas:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchEmpresas();

        return () => {
            mounted = false;
        };
    }, [moduloId, user]);

    return { empresas, loading };
};
