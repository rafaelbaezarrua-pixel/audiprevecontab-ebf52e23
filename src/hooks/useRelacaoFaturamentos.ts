import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RelacaoItem {
    id: string;
    mes: string;
    ano: string;
    valor: number;
}

export interface RelacaoFaturamento {
    id: string;
    empresa_id: string | null;
    nome_empresa: string;
    periodo_inicio: string;
    periodo_fim: string;
    data_emissao: string;
    data_vencimento: string;
    itens: RelacaoItem[];
    valor_total: number;
    criado_por: string | null;
    created_at: string | null;
}

export type RelacaoFaturamentoInsert = Omit<RelacaoFaturamento, "id" | "created_at" | "criado_por">;

export const useRelacaoFaturamentos = () => {
    const queryClient = useQueryClient();

    const { data: relacoes = [], isLoading } = useQuery({
        queryKey: ["relacao_faturamentos"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("relacao_faturamentos")
                .select("*")
                .order("created_at", { ascending: false });
            
            if (error) throw error;
            return data as RelacaoFaturamento[];
        },
        enabled: true,
    });

    const createRelacao = useMutation({
        mutationFn: async (payload: RelacaoFaturamentoInsert) => {
            const { data, error } = await supabase
                .from("relacao_faturamentos")
                .insert(payload as any) // Casting as any because it might not be in types.ts yet
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["relacao_faturamentos"] });
        }
    });

    const deleteRelacao = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("relacao_faturamentos")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["relacao_faturamentos"] });
        }
    });

    return {
        relacoes,
        isLoading,
        createRelacao,
        deleteRelacao
    };
};
