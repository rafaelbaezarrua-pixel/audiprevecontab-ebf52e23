import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FiscalRecord } from "@/types/fiscal";
import { toast } from "sonner";

export function useFiscal(competencia: string) {
    const queryClient = useQueryClient();

    const { data: fiscalData = {}, isLoading, isFetching } = useQuery({
        queryKey: ["fiscal", competencia],
        queryFn: async () => {
            const { data, error } = await supabase.from("fiscal").select("*").eq("competencia", competencia);
            if (error) throw error;
            const map: Record<string, FiscalRecord> = {};
            data?.forEach(f => { map[f.empresa_id] = f as unknown as FiscalRecord; });
            return map;
        },
        staleTime: 5 * 60 * 1000,
    });

    const saveFiscalRecordMutation = useMutation({
        mutationFn: async (record: Partial<FiscalRecord> & { empresa_id: string, competencia: string }) => {
            const { data: existing } = await supabase
                .from("fiscal")
                .select("id")
                .eq("empresa_id", record.empresa_id)
                .eq("competencia", record.competencia)
                .maybeSingle();

            const cleanRecord = Object.fromEntries(Object.entries(record).map(([k, v]) => [k, v === "" ? null : v]));
            if (existing) {
                const { error } = await supabase.from("fiscal").update(cleanRecord).eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("fiscal").insert([cleanRecord]);
                if (error) throw error;
            }
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fiscal", competencia] });
        }
    });

    return { 
        fiscalData, 
        loading: isLoading, 
        isFetching,
        saveFiscalRecord: saveFiscalRecordMutation.mutateAsync 
    };
}
