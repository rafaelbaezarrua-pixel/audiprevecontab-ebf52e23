import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PessoalRecord } from "@/types/pessoal";
import { toast } from "sonner";

export function usePessoal(competencia: string) {
    const queryClient = useQueryClient();

    const { data: pessoalData = {}, isLoading, isFetching } = useQuery({
        queryKey: ["pessoal", competencia],
        queryFn: async () => {
            const { data, error } = await supabase.from("pessoal").select("*").eq("competencia", competencia);
            if (error) throw error;
            const map: Record<string, PessoalRecord> = {};
            data?.forEach(p => { map[p.empresa_id] = p as unknown as PessoalRecord; });
            return map;
        },
        staleTime: 5 * 60 * 1000,
    });

    const savePessoalRecordMutation = useMutation({
        mutationFn: async (record: Partial<PessoalRecord> & { empresa_id: string, competencia: string }) => {
            const { data: existing } = await supabase
                .from("pessoal")
                .select("id")
                .eq("empresa_id", record.empresa_id)
                .eq("competencia", record.competencia)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase.from("pessoal").update(record).eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("pessoal").insert([record]);
                if (error) throw error;
            }
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pessoal", competencia] });
        }
    });

    return { 
        pessoalData, 
        loading: isLoading, 
        isFetching,
        savePessoalRecord: savePessoalRecordMutation.mutateAsync 
    };
}
