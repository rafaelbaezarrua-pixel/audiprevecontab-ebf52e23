import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useEmpresas = (moduloId: string) => {
    const { user } = useAuth();

    const { data: empresas = [], isLoading, isFetching } = useQuery({
        queryKey: ["empresas_modulo", moduloId, user?.id],
        queryFn: async () => {
            if (!user) return [];

            // Busca direta de TODAS as empresas sem filtros de módulo ou vínculo
            const { data: emps, error: empsError } = await supabase
                .from("empresas")
                .select("*")
                .order("nome_empresa");

            if (empsError) throw empsError;
            return emps || [];
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });

    return { empresas, loading: isLoading, isFetching };
};
