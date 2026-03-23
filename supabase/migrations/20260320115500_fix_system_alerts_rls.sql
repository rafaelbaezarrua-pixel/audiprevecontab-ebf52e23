-- ==============================================================================
-- Migration: Fix RLS for System Alerts (Notifications)
-- Description: Allows authenticated users to insert system alerts and read their own.
-- ==============================================================================

-- 1. Permitir que usuários autenticados criem notificações de alerta do sistema
DROP POLICY IF EXISTS "Permitir inserção de alertas do sistema" ON public.notifications;

CREATE POLICY "Permitir inserção de alertas do sistema" 
ON public.notifications 
FOR INSERT 
TO authenticated 
WITH CHECK (type = 'alerta_sistema');

-- 2. Garantir que possam ler suas próprias notificações na tabela de destinatários
-- Verifica se a política já existe para evitar erros (usando bloco DO)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'notification_recipients' 
        AND policyname = 'Usuários podem ler suas próprias notificações'
    ) THEN
        CREATE POLICY "Usuários podem ler suas próprias notificações" 
        ON public.notification_recipients 
        FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 3. Permitir a inserção de destinatários (notification_recipients)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'notification_recipients' 
        AND policyname = 'Permitir inserção de destinatários'
    ) THEN
        CREATE POLICY "Permitir inserção de destinatários" 
        ON public.notification_recipients 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
