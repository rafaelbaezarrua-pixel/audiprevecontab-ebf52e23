import React, { createContext, useContext, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

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
        if (!user || isCheckingRef.current) return;
        isCheckingRef.current = true;

        try {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

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
                    .select("id, empresa_id, empresas(razao_social), data_vencimento")
                    .lte("data_vencimento", limitDateStr);

                if (certificados && certificados.length > 0) {
                    for (const cert of certificados) {
                        const vencimento = new Date(cert.data_vencimento);
                        const isExpired = vencimento < today;
                        const diasRestantes = Math.ceil((vencimento.getTime() - today.getTime()) / (1000 * 3600 * 24));

                        const title = isExpired
                            ? `⚠️ Certificado Expirado: ${cert.empresas?.razao_social || 'Empresa'}`
                            : `⏳ Certificado Expirando: ${cert.empresas?.razao_social || 'Empresa'}`;

                        const message = isExpired
                            ? `O certificado digital venceu em ${cert.data_vencimento.split('-').reverse().join('/')}.`
                            : `O certificado digital vencerá em ${diasRestantes} dias (${cert.data_vencimento.split('-').reverse().join('/')}).`;

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
                    .from("licencas_alvaras")
                    .select("id, numero_licenca, orgao_emissor, data_vencimento, empresa_id, empresas(razao_social)")
                    .lte("data_vencimento", limitDateStr)
                    .eq("status", "ativa");

                if (licencas && licencas.length > 0) {
                    for (const licenca of licencas) {
                        const vencimento = new Date(licenca.data_vencimento);
                        const isExpired = vencimento < today;
                        const diasRestantes = Math.ceil((vencimento.getTime() - today.getTime()) / (1000 * 3600 * 24));

                        const title = isExpired
                            ? `⚠️ Licença Vencida: ${licenca.orgao_emissor}`
                            : `⏳ Licença Expirando: ${licenca.orgao_emissor}`;

                        const message = isExpired
                            ? `A licença nº ${licenca.numero_licenca} da empresa ${licenca.empresas?.razao_social || 'Desconhecida'} venceu.`
                            : `A licença da empresa ${licenca.empresas?.razao_social || 'Desconhecida'} vencerá em ${diasRestantes} dias.`;

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
            // 1. Check if an alert with this exact signature already exists today
            const { data: existing, error: errExist } = await (supabase as any)
                .from("notifications")
                .select("id, metadata")
                .eq("type", "alerta_sistema")
                .limit(50); // Get recent system alerts to filter in JS

            if (existing && existing.length > 0) {
                const alreadySent = existing.find((n: any) => n.metadata?.signature === signature);
                if (alreadySent) {
                    return; // Alert already sent today
                }
            }

            // 2. Create the raw Notification
            const { data: newNotif, error: errCreated } = await (supabase as any)
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

            if (errCreated || !newNotif) {
                console.error("Erro ao gerar alerta base:", errCreated);
                return;
            }

            // 3. Link it to the recipient
            await (supabase as any)
                .from("notification_recipients")
                .insert({
                    notification_id: newNotif.id,
                    user_id: userId,
                    is_read: false
                });

        } catch (e) {
            console.error("Error emitting system alert:", e);
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
