import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Ocorrencia {
    id: string;
    empresa_id: string;
    departamento: string;
    descricao: string;
    cidade: string;
    estado: string;
    data_ocorrencia: string;
    created_at: string;
    usuario_id?: string;
    empresas: {
        nome_empresa: string;
        cnpj: string | null;
    };
    usuarios?: {
        nome_completo: string | null;
    };
}

export const useOcorrencias = () => {
    const queryClient = useQueryClient();

    const { data: ocorrencias = [], isLoading, isFetching } = useQuery({
        queryKey: ["ocorrencias"],
        queryFn: async () => {
            const { data, error } = await (supabase.from("ocorrencias") as any)
                .select("*, empresas(nome_empresa, cnpj), usuarios:usuario_id(nome_completo)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as Ocorrencia[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const createOcorrencia = useMutation({
        mutationFn: async (newOc: any) => {
            const { data, error } = await (supabase.from("ocorrencias") as any)
                .insert([newOc])
                .select("*, empresas(nome_empresa, cnpj), usuarios:usuario_id(nome_completo)")
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
        }
    });

    const deleteOcorrencia = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase.from("ocorrencias") as any).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
        }
    });

    return {
        ocorrencias,
        isLoading,
        isFetching,
        createOcorrencia,
        deleteOcorrencia
    };
};
