import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FiscalRecord } from "@/types/fiscal";
import { toast } from "sonner";

export function useFiscal(competencia: string) {
  const [fiscalData, setFiscalData] = useState<Record<string, FiscalRecord>>({});
  const [loading, setLoading] = useState(true);

  const loadFiscalData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("fiscal").select("*").eq("competencia", competencia);
      if (error) throw error;
      const map: Record<string, FiscalRecord> = {};
      data?.forEach(f => { map[f.empresa_id] = f as unknown as FiscalRecord; });
      setFiscalData(map);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados fiscais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiscalData();
  }, [competencia]);

  const saveFiscalRecord = async (record: Partial<FiscalRecord> & { empresa_id: string, competencia: string }) => {
    try {
      const { data: existing } = await supabase
        .from("fiscal")
        .select("id")
        .eq("empresa_id", record.empresa_id)
        .eq("competencia", record.competencia)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: err } = await supabase.from("fiscal").update(record).eq("id", existing.id);
        error = err;
      } else {
        const { error: err } = await supabase.from("fiscal").insert([record]);
        error = err;
      }

      if (error) throw error;
      loadFiscalData();
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar dados fiscais");
      return false;
    }
  };

  return { fiscalData, loading, loadFiscalData, saveFiscalRecord };
}
