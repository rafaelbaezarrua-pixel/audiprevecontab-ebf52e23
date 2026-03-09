-- ============================================
-- 4. AGENDAMENTO TRIGGER UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_agendamento_notification()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
    v_is_scheduling_enabled BOOLEAN;
BEGIN
    -- Check if notifications for scheduling are enabled (default to true if missing)
    SELECT COALESCE(is_enabled, true) INTO v_is_scheduling_enabled 
    FROM public.notification_types 
    WHERE id = 'scheduling';

    IF v_is_scheduling_enabled THEN
        -- Insert into notifications table
        INSERT INTO public.notifications (title, message, type, link)
        VALUES (
            'Novo Agendamento',
            'Você tem um novo agendamento: ' || NEW.assunto,
            'scheduling',
            '/agendamentos'
        )
        RETURNING id INTO v_notification_id;

        -- Insert into notification_recipients for the selected user ONLY
        IF NEW.usuario_id IS NOT NULL THEN
            INSERT INTO public.notification_recipients (notification_id, user_id, is_read, is_deleted)
            VALUES (v_notification_id, NEW.usuario_id, false, false);
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro no trigger handle_agendamento_notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists on public.agendamentos, so we just update the function.
