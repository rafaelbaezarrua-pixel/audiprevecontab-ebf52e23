import React, { createContext, useContext, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

type AlertasContextType = {
    checkAlerts: () => Promise<void>;
};

const AlertasInteligentesContext = createContext<AlertasContextType | null>(null);

export const useAlertasInteligentes = () => {
    const context = useContext(AlertasInteligentesContext);
    if (!context) {
        throw new Error("useAlertasInteligentes deve ser usado dentro de um AlertasInteligentesProvider");
    }
    return context;
};

export const AlertasInteligentesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, userData } = useAuth();
    const isCheckingRef = useRef(false);

    const checkAlerts = async () => {
        // Only run for authenticated users
        if (!user) return;
        if (isCheckingRef.current) {
            console.log("Sistema de Alertas: Já existe uma verificação em curso.");
            return;
        }

        console.log("Sistema de Alertas: Iniciando verificação geral...");
        isCheckingRef.current = true;

        try {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Optimized: We'll collect IDs of companies with alerts and fetch names on-demand
            // to avoid loading thousands of companies in memory at start.
            const empNamesCache = new Map<string, string>();
            const getEmpName = async (id: string) => {
                if (empNamesCache.has(id)) return empNamesCache.get(id);
                const { data } = await (supabase as any).from("empresas").select("nome_empresa").eq("id", id).maybeSingle();
                const name = data?.nome_empresa || 'Empresa';
                empNamesCache.set(id, name);
                return name;
            };

            // --- 1. CERTIFICADOS EXPIRANDO ---
            // Only admins or people with "certificados" module should probably receive this, 
            // but for safety, we alert admins or the creator of the company.
            // Simplified logic: Alert users who have access to the company.
            if (userData?.modules?.certificados || userData?.isAdmin) {
                // Find certificates expiring in the next 15 days or already expired
                const fifteenDaysFromNow = new Date();
                fifteenDaysFromNow.setDate(today.getDate() + 15);
                const limitDateStr = fifteenDaysFromNow.toISOString().split('T')[0];

                const { data: certificados } = await (supabase as any)
                    .from("certificados_digitais")
                    .select("id, empresa_id, data_vencimento")
                    .lte("data_vencimento", limitDateStr);

                console.log(`Sistema de Alertas: Encontrados ${certificados?.length || 0} certificados em alerta.`);
                if (certificados && certificados.length > 0) {
                    for (const cert of certificados) {
                        const vencimento = new Date(cert.data_vencimento);
                        const isExpired = vencimento < today;
                        const diasRestantes = Math.ceil((vencimento.getTime() - today.getTime()) / (1000 * 3600 * 24));

                        const empName = await getEmpName(cert.empresa_id);
                        const title = isExpired
                            ? `⚠️ Certificado Expirado: ${empName}`
                            : `⏳ Certificado Expirando: ${empName}`;

                        const message = isExpired
                            ? `O certificado digital venceu em ${cert.data_vencimento.split('-').reverse().join('/')}.`
                            : `O certificado digital vencerá em ${diasRestantes} dias (${cert.data_vencimento.split('-').reverse().join('/')}).`;

                        console.log(`Sistema de Alertas: Emitindo alerta para Certificado ${cert.id}`);

                        // Generate unique signature for this alert to prevent SPAM (e.g., today + certID)
                        const signature = `alert_cert_${cert.id}_${todayStr}`;
                        await emitSystemAlert(user.id, title, message, "/certificados", signature);
                    }
                }
            }

            // --- 2. AGENDAMENTOS PENDENTES/ATRASADOS ---
            if (userData?.modules?.agendamentos || userData?.isAdmin) {
                // Find incomplete appointments scheduled for the past
                const { data: agendamentos } = await (supabase as any)
                    .from("agendamentos")
                    .select("id, assunto, data, horario")
                    .eq("usuario_id", user.id)
                    .neq("status", "concluido")
                    .eq("arquivado", false);

                if (agendamentos && agendamentos.length > 0) {
                    for (const agenda of agendamentos) {
                        const scheduledTime = new Date(`${agenda.data}T${agenda.horario}`);
                        if (scheduledTime < today) {
                            const title = `🚨 Agendamento Atrasado: ${agenda.assunto}`;
                            const message = `O agendamento marcado para ${agenda.data.split('-').reverse().join('/')} às ${agenda.horario.slice(0, 5)} está pendente.`;

                            // Unique signature per appointment per day
                            const signature = `alert_agenda_${agenda.id}_${todayStr}`;
                            await emitSystemAlert(user.id, title, message, "/agendamentos", signature);
                        }
                    }
                }
            }

            // --- 3. LICENÇAS VENCENDO ---
            if (userData?.modules?.licencas || userData?.isAdmin) {
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(today.getDate() + 30);
                const limitDateStr = thirtyDaysFromNow.toISOString().split('T')[0];

                const { data: licencas } = await (supabase as any)
                    .from("licencas")
                    .select("id, tipo_licenca, vencimento, empresa_id")
                    .lte("vencimento", limitDateStr)
                    .eq("status", "com_vencimento");

                if (licencas && licencas.length > 0) {
                    for (const licenca of licencas) {
                        const vData = new Date(licenca.vencimento);
                        const isExpired = vData < today;
                        const diasRestantes = Math.ceil((vData.getTime() - today.getTime()) / (1000 * 3600 * 24));

                        const razaoSocial = await getEmpName(licenca.empresa_id);
                        const title = isExpired
                            ? `⚠️ Licença Vencida: ${licenca.tipo_licenca}`
                            : `⏳ Licença Expirando: ${licenca.tipo_licenca}`;

                        const message = isExpired
                            ? `A licença de ${licenca.tipo_licenca} da empresa ${razaoSocial} venceu.`
                            : `A licença de ${licenca.tipo_licenca} da empresa ${razaoSocial} vencerá em ${diasRestantes} dias.`;

                        const signature = `alert_licenca_${licenca.id}_${todayStr}`;
                        await emitSystemAlert(user.id, title, message, "/licencas", signature);
                    }
                }
            }

        } catch (error) {
            console.error("Erro ao verificar Alertas Inteligentes:", error);
        } finally {
            isCheckingRef.current = false;
        }
    };

    // Helper function to emit atomic notifications safely without duplicates
    const emitSystemAlert = async (userId: string, title: string, message: string, link: string, signature: string) => {
        try {
            console.log(`Sistema de Alertas: Processando alerta para assinatura ${signature}`);
            
            // 1. Try to find the existing notification first
            // We avoid 'upsert' here because onConflict with JSONB expressions is prone to picky syntax errors in the client
            const { data: existing } = await (supabase as any)
                .from("notifications")
                .select("id")
                .eq("type", "alerta_sistema")
                .contains("metadata", { signature })
                .maybeSingle();
            
            let notificationId = existing?.id;

            if (!notificationId) {
                // 2. Not found, try to create it
                const { data: created, error: errCreate } = await (supabase as any)
                    .from("notifications")
                    .insert({ 
                        title, 
                        message, 
                        type: "alerta_sistema", 
                        link, 
                        metadata: { signature } 
                    })
                    .select("id")
                    .single();
                
                if (errCreate) {
                    // If insert fails (e.g., race condition where another user created it just now)
                    // we try one last time to fetch it
                    const { data: retry } = await (supabase as any)
                        .from("notifications")
                        .select("id")
                        .eq("type", "alerta_sistema")
                        .contains("metadata", { signature })
                        .maybeSingle();
                    
                    if (retry) {
                        notificationId = retry.id;
                    } else {
                        console.error("Erro ao gerar alerta base:", errCreate);
                        return;
                    }
                } else {
                    notificationId = created?.id;
                    console.log(`Sistema de Alertas: Notificação base ${notificationId} criada.`);
                }
            } else {
                console.log(`Sistema de Alertas: Notificação base ${notificationId} já existe.`);
            }

            // 3. Link the user to the notification
            if (notificationId) {
                await linkUserToNotification(userId, notificationId, title, message, link);
            }

        } catch (e) {
            console.error("Error emitting system alert:", e);
        }
    };

    const linkUserToNotification = async (userId: string, notificationId: string, title: string, message: string, link: string) => {
        // Check if current user is already linked to this notification
        const { data: existingLink } = await (supabase as any)
            .from("notification_recipients")
            .select("id")
            .eq("notification_id", notificationId)
            .eq("user_id", userId)
            .maybeSingle();

        if (existingLink) {
            console.log(`Sistema de Alertas: Usuário já possui vínculo com a notificação ${notificationId}.`);
            return;
        }

        // Link the user to the notification
        console.log(`Sistema de Alertas: Vinculando notificação ${notificationId} ao usuário ${userId}...`);
        const { error: errLink } = await (supabase as any)
            .from("notification_recipients")
            .insert({
                notification_id: notificationId,
                user_id: userId,
                is_read: false
            });

        if (!errLink) {
            toast.info(title, {
                description: message
            });
        } else {
            console.error("Erro ao vincular destinatário:", errLink);
        }
    };

    // Run automatically exactly ONCE after Authentication
    useEffect(() => {
        if (user && userData !== undefined) {
            // Small delay to prevent blocking the main UI thread during login render
            const timer = setTimeout(() => {
                checkAlerts();
            }, 3000);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, userData]);

    return (
        <AlertasInteligentesContext.Provider value={{ checkAlerts }}>
            {children}
        </AlertasInteligentesContext.Provider>
    );
};
