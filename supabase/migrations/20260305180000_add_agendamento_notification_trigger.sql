-- Ensure the notification type for scheduling exists and is enabled
INSERT INTO public.notification_types (id, label, description, is_enabled)
VALUES ('scheduling', 'Agendamentos', 'Notifica o usuário quando um novo agendamento é atribuído a ele.', true)
ON CONFLICT (id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Trigger function to create notification when a new agendamento is inserted
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

        -- Insert into notification_recipients for the selected user
        -- Note: Ensure NEW.usuario_id is not null
        IF NEW.usuario_id IS NOT NULL THEN
            INSERT INTO public.notification_recipients (notification_id, user_id, is_read, is_deleted)
            VALUES (v_notification_id, NEW.usuario_id, false, false);
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error (visible in Supabase Postgres logs)
    RAISE WARNING 'Erro no trigger handle_agendamento_notification: %', SQLERRM;
    RETURN NEW; -- Don't block the main insert if notification fails
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS on_agendamento_created ON public.agendamentos;
CREATE TRIGGER on_agendamento_created
    AFTER INSERT ON public.agendamentos
    FOR EACH ROW EXECUTE FUNCTION public.handle_agendamento_notification();
