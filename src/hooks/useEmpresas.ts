import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useEmpresas = (moduloId: string) => {
    const { user } = useAuth();

    const { data: empresas = [], isLoading, isFetching } = useQuery({
        queryKey: ["empresas_modulo", moduloId, user?.id],
        queryFn: async () => {
            if (!user) return [];

            // 1. Detect user level and linked company
            const { data: profile } = await supabase.from("profiles").select("role, empresa_id").eq("user_id", user.id).maybeSingle();
            const { data: roleCheck } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
            const { data: accessCheck } = await supabase.from("empresa_acessos").select("empresa_id").eq("user_id", user.id).maybeSingle();
            
            const isAdmin = roleCheck?.role === "admin" || profile?.role === "admin";
            const empresaId = profile?.empresa_id || accessCheck?.empresa_id;
            const isClient = !isAdmin && !!empresaId;
            const isTeam = !isAdmin && !empresaId;

            // 2. Prepare query
            let query = supabase.from("empresas").select("*").order("nome_empresa");

            // 3. Clients see ONLY their own company, Team sees EVERYTHING
            if (isClient && empresaId) {
                query = query.eq("id", empresaId);
            }

            // 4. Filter by active module ONLY for Clients
            // For Team/Admin, show all 104 companies regardless of the active module filter
            if (isClient && moduloId && !['declaracoes_mensais', 'contabil'].includes(moduloId)) {
                query = query.contains("modulos_ativos", [moduloId]);
            }

            const { data: emps, error: empsError } = await query;
            if (empsError) throw empsError;
            if (!emps) return [];

            // 6. Final module-level permission check for everyone
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

            return emps.filter((emp) => {
                if (isAdmin) return true; // Admin has full access
                const modulosPermitidos = acessosMap.get(emp.id);
                // Se não houver restrição específica na tabela empresa_acessos, 
                // permitimos o acesso se for Equipe ou se for o próprio Cliente da empresa.
                if (!modulosPermitidos) return isTeam || isClient; 
                return modulosPermitidos.includes(moduloId);
            });
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });

    return { empresas, loading: isLoading, isFetching };
};
