import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ContabilRecord } from "@/types/contabil";
import { toast } from "sonner";

export function useContabil(competencia: string) {
    const queryClient = useQueryClient();

    const { data: contabilData = {}, isLoading, isFetching } = useQuery({
        queryKey: ["contabil", competencia],
        queryFn: async () => {
            const { data, error } = await supabase.from("contabil").select("*").eq("competencia", competencia);
            if (error) {
                console.error("Erro ao buscar dados contábeis:", error);
                return {};
            }
            const map: Record<string, ContabilRecord> = {};
            data?.forEach(f => { map[f.empresa_id] = f as unknown as ContabilRecord; });
            return map;
        },
        staleTime: 5 * 60 * 1000,
    });

    const saveContabilRecordMutation = useMutation({
        mutationFn: async (record: Partial<ContabilRecord> & { empresa_id: string, competencia: string }) => {
            const { data: existing } = await supabase
                .from("contabil")
                .select("id")
                .eq("empresa_id", record.empresa_id)
                .eq("competencia", record.competencia)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase.from("contabil").update(record).eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("contabil").insert([record]);
                if (error) throw error;
            }
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contabil", competencia] });
        }
    });

    return { 
        contabilData, 
        loading: isLoading, 
        isFetching,
        saveContabilRecord: saveContabilRecordMutation.mutateAsync 
    };
}
