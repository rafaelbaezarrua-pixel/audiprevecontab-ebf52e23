
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HonorarioConfig, HonorarioMensal, ServicoEsporadico } from "@/types/honorarios";
import { toast } from "sonner";
import { subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const useHonorarios = (competencia?: string) => {
  const queryClient = useQueryClient();

  // Monthly Fees (General View)
  const { data: listGeral = [], isLoading: loadingGeral } = useQuery({
    queryKey: ["honorarios_mensal_geral", competencia],
    queryFn: async () => {
      if (!competencia) return [];
      const { data, error } = await supabase
        .from("honorarios_mensal")
        .select("*, empresas (nome_empresa)")
        .eq("competencia", competencia);
      if (error) throw error;
      
      // Map JSON fields to match our interfaces
      return (data as any[]).map(item => ({
        ...item,
        detalhes_calculo: item.detalhes_calculo || [],
        observacoes: item.observacoes || { texto: "" }
      })) as HonorarioMensal[];
    },
    enabled: !!competencia
  });

  // Sporadic Services
  const { data: listEsporadicos = [], isLoading: loadingEsporadicos } = useQuery({
    queryKey: ["servicos_esporadicos", competencia],
    queryFn: async () => {
      if (!competencia) return [];
      const { data, error } = await (supabase as any)
        .from("servicos_esporadicos")
        .select("*")
        .eq("competencia", competencia);
      if (error) throw error;
      return data as ServicoEsporadico[];
    },
    enabled: !!competencia
  });

  // Historical Revenue Trend (last 6 months)
  const { data: revenueTrend = [], isLoading: loadingTrend } = useQuery({
    queryKey: ["honorarios_revenue_trend"],
    queryFn: async () => {
      const months = Array.from({ length: 6 }).map((_, i) => format(subMonths(new Date(), 5 - i), "yyyy-MM"));
      
      const { data } = await supabase
        .from("honorarios_mensal")
        .select("competencia, valor_total, pago")
        .in("competencia", months);

      return months.map(m => {
        const monthData = data?.filter(d => d.competencia === m) || [];
        return {
          month: format(new Date(m + "-01"), "MMM", { locale: ptBR }),
          total: monthData.reduce((acc, curr) => acc + (curr.valor_total || 0), 0),
          pago: monthData.filter(d => d.pago).reduce((acc, curr) => acc + (curr.valor_total || 0), 0)
        };
      });
    }
  });

  const saveConfig = useMutation({
    mutationFn: async (payload: HonorarioConfig) => {
      const { id, ...data } = payload;
      if (id) {
        const { error } = await supabase.from("honorarios_config").update(data as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("honorarios_config").insert([data as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configuração de honorários salva!");
      queryClient.invalidateQueries({ queryKey: ["honorarios_config"] });
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message)
  });

  const saveMensal = useMutation({
    mutationFn: async (payload: Partial<HonorarioMensal>) => {
      const { id, ...data } = payload;
      // Ensure status is correctly typed for Supabase if it's a constrained string
      const updateData = { ...data } as any;
      
      if (id) {
        const { error } = await supabase.from("honorarios_mensal").update(updateData).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("honorarios_mensal").insert([updateData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Controle mensal salvo!");
      queryClient.invalidateQueries({ queryKey: ["honorarios_mensal"] });
      queryClient.invalidateQueries({ queryKey: ["honorarios_mensal_geral"] });
      queryClient.invalidateQueries({ queryKey: ["honorarios_revenue_trend"] });
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message)
  });

  const saveEsporadico = useMutation({
    mutationFn: async (payload: ServicoEsporadico) => {
      const { id, ...data } = payload;
      if (id) {
        const { error } = await (supabase as any).from("servicos_esporadicos").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("servicos_esporadicos").insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Serviço esporádico salvo!");
      queryClient.invalidateQueries({ queryKey: ["servicos_esporadicos"] });
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message)
  });

  const deleteEsporadico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("servicos_esporadicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Excluído");
      queryClient.invalidateQueries({ queryKey: ["servicos_esporadicos"] });
    }
  });

  return {
    listGeral,
    listEsporadicos,
    revenueTrend,
    loading: loadingGeral || loadingEsporadicos || loadingTrend,
    saveConfig,
    saveMensal,
    saveEsporadico,
    deleteEsporadico
  };
};
