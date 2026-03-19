import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PessoalRecord } from "@/types/pessoal";
import { toast } from "sonner";

export function usePessoal(competencia: string) {
  const [pessoalData, setPessoalData] = useState<Record<string, PessoalRecord>>({});
  const [loading, setLoading] = useState(true);

  const loadPessoalData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("pessoal").select("*").eq("competencia", competencia);
      if (error) throw error;
      const map: Record<string, PessoalRecord> = {};
      data?.forEach(p => { map[p.empresa_id] = p as unknown as PessoalRecord; });
      setPessoalData(map);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados do pessoal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPessoalData();
  }, [competencia]);

  const savePessoalRecord = async (record: Partial<PessoalRecord> & { empresa_id: string, competencia: string }) => {
    try {
      const { data: existing } = await supabase
        .from("pessoal")
        .select("id")
        .eq("empresa_id", record.empresa_id)
        .eq("competencia", record.competencia)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: err } = await supabase.from("pessoal").update(record).eq("id", existing.id);
        error = err;
      } else {
        const { error: err } = await supabase.from("pessoal").insert([record]);
        error = err;
      }

      if (error) throw error;
      loadPessoalData();
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar dados do pessoal");
      return false;
    }
  };

  return { pessoalData, loading, loadPessoalData, savePessoalRecord };
}
