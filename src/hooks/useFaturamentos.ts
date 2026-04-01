import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type Faturamento = Database["public"]["Tables"]["faturamentos"]["Row"];
export type FaturamentoInsert = Database["public"]["Tables"]["faturamentos"]["Insert"];

export const useFaturamentos = (competencia?: string) => {
    const queryClient = useQueryClient();

    const { data: faturamentos = [], isLoading } = useQuery({
        queryKey: ["faturamentos", competencia],
        queryFn: async () => {
            let query = supabase
                .from("faturamentos")
                .select("*")
                .order("created_at", { ascending: false });
            
            if (competencia) {
                query = query.eq("competencia", competencia);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Faturamento[];
        },
        enabled: true,
    });

    const createFaturamento = useMutation({
        mutationFn: async (payload: FaturamentoInsert) => {
            const { data, error } = await supabase
                .from("faturamentos")
                .insert(payload)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["faturamentos"] });
        }
    });

    const deleteFaturamento = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("faturamentos")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["faturamentos"] });
        }
    });

    return {
        faturamentos,
        isLoading,
        createFaturamento,
        deleteFaturamento
    };
};
