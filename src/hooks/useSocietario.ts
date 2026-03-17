
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Empresa, Processo } from "@/types/societario";
import { toast } from "sonner";

export const useSocietario = () => {
  const queryClient = useQueryClient();

  const { data: listEmpresas = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      // Keeping original listEmpresas for backward compatibility in forms/dropdowns
      const { data } = await supabase.from("empresas").select("*").order("nome_empresa");
      const { data: sociosData } = await supabase.from("socios").select("empresa_id");
      const sociosCounts: Record<string, number> = {};
      sociosData?.forEach(s => {
        sociosCounts[s.empresa_id] = (sociosCounts[s.empresa_id] || 0) + 1;
      });
      return (data || []).map(e => ({ ...e, socios_count: sociosCounts[e.id] || 0 })) as Empresa[];
    }
  });

  const getPaginatedEmpresas = async (page: number, limit: number, search: string, situacao: string, regime: string, moduloId?: string, userId?: string) => {
    let query = supabase.from("empresas").select("*", { count: 'exact' });

    if (moduloId && moduloId !== "declaracoes_mensais") {
      query = query.contains("modulos_ativos", [moduloId]);
    }

    if (search) {
      query = query.or(`nome_empresa.ilike.%${search}%,cnpj.ilike.%${search}%`);
    }

    if (situacao && situacao !== 'todas') {
      const situacaoMap: Record<string, string> = {
        'ativas': 'ativa',
        'paralisadas': 'paralisada',
        'baixadas': 'baixada',
        'entregue': 'entregue',
        'mei': 'mei'
      };

      const mappedSituacao = situacaoMap[situacao] || situacao;

      if (situacao === 'mei') {
         // Filter by regime MEI OR situation MEI
         query = query.or(`regime_tributario.eq.mei,situacao.eq.mei`);
      } else if (mappedSituacao === 'ativa') {
         query = query.eq("situacao", "ativa");
      } else {
         query = query.eq("situacao", mappedSituacao as any);
      }
    }

    if (regime && regime !== 'todos') {
      query = query.eq("regime_tributario", regime as any);
    }

    const from = page * limit;
    const to = from + limit - 1;

    const { data: empresasData, count, error } = await query
      .order('nome_empresa')
      .range(from, to);

    if (error) throw error;

    // Get socio count map for these specific companies
    const empIds = (empresasData || []).map(e => e.id);
    const { data: sociosData } = await supabase.from("socios").select("empresa_id").in("empresa_id", empIds);
    const sociosCounts: Record<string, number> = {};
    sociosData?.forEach(s => {
      sociosCounts[s.empresa_id] = (sociosCounts[s.empresa_id] || 0) + 1;
    });

    const enrichedData = (empresasData || []).map(e => ({ ...e, socios_count: sociosCounts[e.id] || 0 })) as Empresa[];

    if (userId && moduloId) {
      const { data: acessos } = await supabase
        .from("empresa_acessos")
        .select("empresa_id, modulos_permitidos")
        .eq("user_id", userId);

      if (acessos && acessos.length > 0) {
        const acessosMap = new Map(acessos.map(a => [a.empresa_id, a.modulos_permitidos]));
        const filtered = enrichedData.filter(emp => {
          const modulosPermitidos = acessosMap.get(emp.id);
          if (!modulosPermitidos) return true; // Full access if no specific rule
          return modulosPermitidos.includes(moduloId);
        });
        return { data: filtered, count: count || 0 };
      }
    }
    
    return { data: enrichedData, count: count || 0 };
  };

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
    updateProcesso,
    getPaginatedEmpresas
  };
};
