import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";

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

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
    minIntervalMs: 2000, // Mínimo 2 segundos entre requisições
    maxRetries: 3,
    retryDelayMs: 1000,
};

// Validação e sanitização de dados de tarefa
const sanitizeTarefa = (a: any, mappedUsers: any[]): Tarefa => {
    // Sanitização de strings
    const sanitizeString = (str: string, maxLen = 5000): string => {
        if (typeof str !== 'string') return '';
        return str
            .replace(/<script/gi, '&lt;script')
            .replace(/<\/script>/gi, '&lt;/script&gt;')
            .replace(/on\w+=/gi, '')
            .slice(0, maxLen);
    };

    // Parse seguro do histórico
    let historico: TarefaHistorico[] = [];
    try {
        if (a.historico && typeof a.historico === 'string') {
            const parsed = JSON.parse(a.historico);
            if (Array.isArray(parsed)) {
                historico = parsed
                    .filter((h: any) => h && typeof h === 'object')
                    .map((h: any) => ({
                        status: sanitizeString(String(h.status || ''), 100),
                        data: String(h.data || ''),
                        usuario_id: String(h.usuario_id || ''),
                        usuario_nome: sanitizeString(String(h.usuario_nome || ''), 200),
                        observacao: h.observacao ? sanitizeString(String(h.observacao), 2000) : undefined,
                    }));
            }
        } else if (Array.isArray(a.historico)) {
            historico = a.historico
                .filter((h: any) => h && typeof h === 'object')
                .map((h: any) => ({
                    status: sanitizeString(String(h.status || ''), 100),
                    data: String(h.data || ''),
                    usuario_id: String(h.usuario_id || ''),
                    usuario_nome: sanitizeString(String(h.usuario_nome || ''), 200),
                    observacao: h.observacao ? sanitizeString(String(h.observacao), 2000) : undefined,
                }));
        }
    } catch {
        historico = [];
    }

    // Enriquecer histórico com nomes
    historico = historico.map((h: TarefaHistorico) => ({
        ...h,
        usuario_nome: h.usuario_nome || mappedUsers.find(u => u.id === h.usuario_id)?.nome || "Sistema",
    }));

    // Determinar status atual
    let currentStatus = a.status || "em_aberto";
    const validStatuses = ["recebida", "em_andamento", "resposta", "concluido", "em_aberto", "pendente"];
    if (!validStatuses.includes(currentStatus)) {
        currentStatus = "em_aberto";
    }

    // Verificar se está pendente (atrasado)
    // SOMENTE se a tarefa estiver em aberto. Se já foi recebida ou iniciada, ela deve seguir o fluxo normal.
    // Isso evita que a tarefa "volte" para pendente quando o usuário tenta mudar o status.
    const now = new Date();
    if (currentStatus === "em_aberto" && a.data) {
        const scheduledDateTime = new Date(`${a.data}T${a.horario || '00:00'}`);
        if (scheduledDateTime < now) {
            currentStatus = "pendente";
        }
    }

    return {
        ...a,
        id: String(a.id || ''),
        assunto: sanitizeString(a.assunto || '', 500),
        informacoes_adicionais: sanitizeString(a.informacoes_adicionais || '', 10000),
        competencia: String(a.competencia || ''),
        status: currentStatus,
        arquivado: Boolean(a.arquivado),
        usuario_nome: mappedUsers.find(u => u.id === a.usuario_id)?.nome || "Não encontrado",
        criado_por_nome: mappedUsers.find(u => u.id === a.criado_por)?.nome || "Sistema",
        historico,
    };
};

export const useTarefas = (competencia: string) => {
    const queryClient = useQueryClient();
    const lastRequestTimeRef = useRef<number>(0);
    const requestQueueRef = useRef<Promise<any> | null>(null);

    // Rate limiting: aguarda intervalo mínimo entre requisições
    const enforceRateLimit = async (): Promise<void> => {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTimeRef.current;

        if (timeSinceLastRequest < RATE_LIMIT_CONFIG.minIntervalMs) {
            const delay = RATE_LIMIT_CONFIG.minIntervalMs - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        lastRequestTimeRef.current = Date.now();
    };

    const { data: tarefashData, isLoading, isFetching } = useQuery({
        queryKey: ["tarefas", competencia],
        queryFn: async () => {
            // Rate limiting
            await enforceRateLimit();

            // 1. Carregar usuários para mapear nomes
            const { data: usersData } = await supabase.from("profiles").select("id, full_name, user_id").eq("ativo", true);
            const mappedUsers = (usersData || [])
                .filter((u: any) => u.user_id)
                .map((u: any) => ({
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

            const overdueIds: string[] = [];
            const enrichedData = (agendaData || []).map((a: any) => {
                const sanitized = sanitizeTarefa(a, mappedUsers);
                if (sanitized.status === "pendente" && a.status !== "pendente") {
                    overdueIds.push(a.id);
                }
                return sanitized;
            }) as Tarefa[];

            // Atualiza o status no banco para os que ficaram pendentes (fire and forget)
            if (overdueIds.length > 0) {
                // Usamos 'as any' porque a tabela tarefas pode não estar nos tipos gerados
                supabase.from("tarefas" as any)
                    .update({ status: "pendente" } as any)
                    .in("id", overdueIds)
                    .then(({ error }) => { 
                        if (error) console.error("[TAREFAS] Erro ao atualizar automáticos para pendente:", error); 
                    })
                    .catch(err => console.error("[TAREFAS] Falha crítica na atualização de background:", err));
            }

            return enrichedData;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        retry: (failureCount, error) => {
            // Não retry para erros de permissão/RLS
            if (error.message?.includes('permission') || error.message?.includes('RLS')) {
                return false;
            }
            return failureCount < RATE_LIMIT_CONFIG.maxRetries;
        },
        retryDelay: (attemptIndex) => Math.min(RATE_LIMIT_CONFIG.retryDelayMs * Math.pow(2, attemptIndex), 10000),
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
