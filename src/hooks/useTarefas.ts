import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Tarefa {
    id: string;
    data: string;
    horario: string;
    usuario_id: string;
    criado_por: string;
    assunto: string;
    informacoes_adicionais: string;
    competencia: string;
    usuario_nome?: string;
    criado_por_nome?: string;
    status: "recebida" | "em_andamento" | "resposta" | "concluido" | "em_aberto" | "pendente";
    arquivado: boolean;
    empresas?: { nome_empresa: string } | null;
    resposta?: string;
    historico?: TarefaHistorico[];
}

export interface TarefaHistorico {
    status: string;
    data: string;
    usuario_id: string;
    usuario_nome?: string;
    observacao?: string;
}

export const useTarefas = (competencia: string) => {
    const queryClient = useQueryClient();

    const { data: tarefashData, isLoading, isFetching } = useQuery({
        queryKey: ["tarefas", competencia],
        queryFn: async () => {
            // 1. Carregar usuários para mapear nomes
            const { data: usersData } = await supabase.from("profiles").select("id, full_name, user_id").eq("ativo", true);
            const mappedUsers = (usersData || []).filter((u: any) => u.user_id).map((u: any) => ({
                id: u.user_id,
                nome: u.full_name || "Sem Nome"
            }));

            // 2. Carregar tarefas
            const { data: agendaData, error } = await (supabase
                .from("tarefas" as any)
                .select("*, empresas(nome_empresa)")
                .eq("competencia", competencia)
                .order("horario", { ascending: true }) as any);

            if (error) throw error;

            const enrichedData = (agendaData || []).map((a: any) => {
                let currentStatus = a.status || "em_aberto";
                
                const isAssignedToOther = a.criado_por && a.usuario_id && a.criado_por !== a.usuario_id;

                // Migração automática: converter status antigos para o novo fluxo
                if (isAssignedToOther) {
                    // Tarefas atribuídas a outro usuário
                    if (currentStatus === "em_aberto" || currentStatus === "pendente") {
                        currentStatus = "recebida";
                    }
                }

                // Parse historico from JSON
                let historico: TarefaHistorico[] = [];
                try {
                    if (a.historico && typeof a.historico === 'string') {
                        historico = JSON.parse(a.historico);
                    } else if (Array.isArray(a.historico)) {
                        historico = a.historico;
                    }
                } catch {
                    historico = [];
                }

                // Enriquecer historico com nomes
                historico = historico.map((h: TarefaHistorico) => ({
                    ...h,
                    usuario_nome: mappedUsers.find(u => u.id === h.usuario_id)?.nome || "Sistema"
                }));

                return {
                    ...a,
                    status: currentStatus,
                    arquivado: !!a.arquivado,
                    usuario_nome: mappedUsers.find(u => u.id === a.usuario_id)?.nome || "Não encontrado",
                    criado_por_nome: mappedUsers.find(u => u.id === a.criado_por)?.nome || "Sistema",
                    historico,
                };
            }) as Tarefa[];

            return enrichedData;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status, userId, resposta }: { id: string, status: string, userId?: string, resposta?: string }) => {
            // Buscar tarefa atual para atualizar historico
            const { data: currentTask } = await (supabase.from("tarefas" as any).select("historico").eq("id", id).single() as any);
            
            let historico: TarefaHistorico[] = [];
            try {
                if (currentTask?.historico) {
                    historico = typeof currentTask.historico === 'string' ? JSON.parse(currentTask.historico) : currentTask.historico;
                }
            } catch { historico = []; }

            // Adicionar entrada no historico
            historico.push({
                status,
                data: new Date().toISOString(),
                usuario_id: userId || "",
                observacao: resposta || undefined
            });

            const updatePayload: any = { 
                status, 
                historico: JSON.stringify(historico) 
            };
            if (resposta !== undefined) {
                updatePayload.resposta = resposta;
            }

            const { error } = await (supabase.from("tarefas" as any).update(updatePayload).eq("id", id) as any);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tarefas", competencia] });
        }
    });

    const updateArquivado = useMutation({
        mutationFn: async ({ id, arquivado }: { id: string, arquivado: boolean }) => {
            const { error } = await (supabase.from("tarefas" as any).update({ arquivado } as any).eq("id", id) as any);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tarefas", competencia] });
        }
    });

    const deleteTarefa = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase.from("tarefas" as any).delete().eq("id", id) as any);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tarefas", competencia] });
        }
    });

    return {
        tarefas: tarefashData || [],
        isLoading,
        isFetching,
        updateStatus,
        updateArquivado,
        deleteTarefa
    };
};
