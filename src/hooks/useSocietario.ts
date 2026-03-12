
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Empresa, Processo } from "@/types/societario";
import { toast } from "sonner";

export const useSocietario = () => {
  const queryClient = useQueryClient();

  const { data: listEmpresas = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("*").order("nome_empresa");
      const { data: sociosData } = await supabase.from("socios").select("empresa_id");
      const sociosCounts: Record<string, number> = {};
      sociosData?.forEach(s => {
        sociosCounts[s.empresa_id] = (sociosCounts[s.empresa_id] || 0) + 1;
      });
      return (data || []).map(e => ({ ...e, socios_count: sociosCounts[e.id] || 0 })) as Empresa[];
    }
  });

  const { data: listProcessos = [], isLoading: loadingProcessos } = useQuery({
    queryKey: ["processos_societarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos_societarios" as any)
        .select(`
          *,
          historico:processos_societarios_historico(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as Processo[]) || [];
    }
  });

  const addHistorico = async (processoId: string, acao: string, detalhes?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("processos_societarios_historico" as any).insert({
      processo_id: processoId,
      usuario_id: user.id,
      acao,
      detalhes
    });
  };

  const deleteProcesso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("processos_societarios" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Processo excluído!");
      queryClient.invalidateQueries({ queryKey: ["processos_societarios"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    }
  });

  const updateProcesso = useMutation({
    mutationFn: async ({ id, updates, acao, detalhes }: { id: string, updates: any, acao?: string, detalhes?: string }) => {
      const { error } = await supabase.from("processos_societarios" as any).update(updates).eq("id", id);
      if (error) throw error;
      if (acao) {
        await addHistorico(id, acao, detalhes);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos_societarios"] });
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    }
  });

  return {
    empresas: listEmpresas,
    processos: listProcessos,
    isLoading: loadingEmpresas || loadingProcessos,
    addHistorico,
    deleteProcesso,
    updateProcesso
  };
};
