
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IRPFRecord } from "@/types/irpf";
import { toast } from "sonner";

const EMPTY_ARRAY: any[] = [];

export const useIRPF = (year: number) => {
  const queryClient = useQueryClient();

  const { data: records = EMPTY_ARRAY, isLoading } = useQuery({
    queryKey: ["controle_irpf", year],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("controle_irpf")
        .select("*")
        .eq("ano_exercicio", year)
        .order("nome_completo");
      if (error) throw error;
      return data as IRPFRecord[];
    }
  });

  const saveRecord = useMutation({
    mutationFn: async (payload: Partial<IRPFRecord>) => {
      const { id, ...data } = payload;
      const finalPayload = {
        ...data,
        ano_exercicio: id ? data.ano_exercicio : year,
        cpf: data.cpf || null,
        data_pagamento: data.data_pagamento || null,
        data_transmissao: data.data_transmissao || null,
        feito_por: data.feito_por || null,
        forma_pagamento: data.forma_pagamento || null,
        valor_a_pagar: Number(data.valor_a_pagar || 0)
      };

      if (id) {
        const { error } = await (supabase as any).from("controle_irpf").update(finalPayload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("controle_irpf").insert([finalPayload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Informações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["controle_irpf", year] });
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message)
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("controle_irpf").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido");
      queryClient.invalidateQueries({ queryKey: ["controle_irpf", year] });
    },
    onError: (err: any) => toast.error("Erro ao remover")
  });

  return {
    records,
    isLoading,
    saveRecord,
    deleteRecord
  };
};
