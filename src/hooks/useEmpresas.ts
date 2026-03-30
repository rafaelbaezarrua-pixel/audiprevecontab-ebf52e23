import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useEmpresas = (moduloId: string) => {
    const { user } = useAuth();

    const { data: empresas = [], isLoading, isFetching } = useQuery({
        queryKey: ["empresas_modulo", moduloId, user?.id],
        queryFn: async () => {
            if (!user) return [];

            // 1. Fetch companies
            let query = supabase.from("empresas").select("*").order("nome_empresa");

            if (moduloId && moduloId !== "declaracoes_mensais") {
                query = query.contains("modulos_ativos", [moduloId]);
            }

            const { data: emps, error: empsError } = await query;
            if (empsError) throw empsError;
            if (!emps) return [];

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

            // 3. Filter the companies based on permission row
            return emps.filter((emp) => {
                const modulosPermitidos = acessosMap.get(emp.id);
                // If no row exists in empresa_acessos for this user, they have full access (return true)
                // If row exists, check if modulos_permitidos includes the current moduloId
                if (!modulosPermitidos) return true;
                return modulosPermitidos.includes(moduloId);
            });
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });

    return { empresas, loading: isLoading, isFetching };
};
