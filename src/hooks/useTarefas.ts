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
    status: "em_aberto" | "concluido" | "pendente";
    arquivado: boolean;
    empresas?: { nome_empresa: string } | null;
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
                    criado_por_nome: mappedUsers.find(u => u.id === a.criado_por)?.nome || "Sistema",
                };
            }) as Tarefa[];

            // 3. Atualizar itens atrasados no banco (de fundo)
            if (overdueIds.length > 0) {
                supabase.from("tarefas" as any).update({ status: "pendente" } as any).in("id", overdueIds).then();
            }

            return enrichedData;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await (supabase.from("tarefas" as any).update({ status } as any).eq("id", id) as any);
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
