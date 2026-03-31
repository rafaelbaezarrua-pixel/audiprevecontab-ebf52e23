import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Agendamento {
    id: string;
    data: string;
    horario: string;
    usuario_id: string;
    criado_por: string;
    assunto: string;
    informacoes_adicionais: string;
    competencia: string;
    usuario_nome?: string;
    status: "em_aberto" | "concluido" | "pendente";
    arquivado: boolean;
}

export const useAgendamentos = (competencia: string) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel('agendamentos_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'agendamentos'
                },
                () => {
                    // Invalida as queries de agendamentos para refletir mudanças imediatamente
                    queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const { data: agendamentosData, isLoading, isFetching } = useQuery({
        queryKey: ["agendamentos", competencia],
        queryFn: async () => {
            // 1. Carregar usuários para mapear nomes
            const { data: usersData } = await supabase.from("profiles").select("id, full_name, user_id").eq("ativo", true);
            const mappedUsers = (usersData || []).filter((u: any) => u.user_id).map((u: any) => ({
                id: u.user_id,
                nome: u.full_name || "Sem Nome"
            }));

            // 2. Carregar agendamentos
            const { data: agendaData, error } = await (supabase
                .from("agendamentos" as any)
                .select("*")
                .eq("competencia", competencia)
                .order("horario", { ascending: true }) as any);

            if (error) throw error;

            const now = new Date();
            const overdueIds: string[] = [];

            const enrichedData = (agendaData || []).map((a: any) => {
                let currentStatus = a.status || "em_aberto";
                
                if (currentStatus === "em_aberto" && a.data && a.horario) {
                    const scheduledDateTime = new Date(`${a.data}T${a.horario}`);
                    if (scheduledDateTime < now) {
                        currentStatus = "pendente";
                        overdueIds.push(a.id);
                    }
                }

                return {
                    ...a,
                    status: currentStatus,
                    arquivado: !!a.arquivado,
                    usuario_nome: mappedUsers.find(u => u.id === a.usuario_id)?.nome || "Não encontrado",
                };
            }) as Agendamento[];

            // 3. Atualizar itens atrasados no banco (de fundo)
            if (overdueIds.length > 0) {
                supabase.from("agendamentos" as any).update({ status: "pendente" } as any).in("id", overdueIds).then();
            }

            return enrichedData;
        },
        staleTime: 30 * 1000, // 30 segundos de cache (mais fresco)
    });

    const createAgendamento = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await (supabase.from("agendamentos" as any).insert(payload) as any);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
        }
    });

    const updateAgendamento = useMutation({
        mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
            const { error } = await (supabase.from("agendamentos" as any).update(payload).eq("id", id) as any);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
        }
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await (supabase.from("agendamentos" as any).update({ status } as any).eq("id", id) as any);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agendamentos", competencia] });
        }
    });

    const updateArquivado = useMutation({
        mutationFn: async ({ id, arquivado }: { id: string, arquivado: boolean }) => {
            const { error } = await (supabase.from("agendamentos" as any).update({ arquivado } as any).eq("id", id) as any);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agendamentos", competencia] });
        }
    });

    const deleteAgendamento = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase.from("agendamentos" as any).delete().eq("id", id) as any);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agendamentos", competencia] });
        }
    });

    return {
        agendamentos: agendamentosData || [],
        isLoading,
        isFetching,
        createAgendamento,
        updateAgendamento,
        updateStatus,
        updateArquivado,
        deleteAgendamento
    };
};

