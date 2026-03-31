import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Recibo {
    id: string;
    nome_cliente: string;
    valor: number;
    referente: string;
    data_emissao: string;
    competencia: string;
    created_at: string;
}

export const useRecibos = (competencia?: string) => {
    const queryClient = useQueryClient();

    const { data: recibos = [], isLoading } = useQuery({
        queryKey: ["recibos", competencia],
        queryFn: async () => {
            let query = supabase
                .from("recibos" as any)
                .select("*")
                .order("created_at", { ascending: false });
            
            if (competencia) {
                query = query.eq("competencia", competencia);
            }

            const { data, error } = await (query as any);
            if (error) throw error;
            return data as Recibo[];
        },
        enabled: true,
    });

    const createRecibo = useMutation({
        mutationFn: async (payload: Omit<Recibo, "id" | "created_at">) => {
            const { data, error } = await (supabase.from("recibos" as any).insert(payload).select().single() as any);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recibos"] });
        }
    });

    const deleteRecibo = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase.from("recibos" as any).delete().eq("id", id) as any);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recibos"] });
        }
    });

    return {
        recibos,
        isLoading,
        createRecibo,
        deleteRecibo
    };
};
