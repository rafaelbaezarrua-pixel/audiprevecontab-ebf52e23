-- Migration to rename "Agendamentos" to "Tarefas" in internal logic and enforce privacy rules

-- 1. Update notification type
UPDATE public.notification_types 
SET label = 'Tarefas', description = 'Notifica o usuário quando uma nova tarefa é atribuída a ele.'
WHERE id = 'scheduling' OR id = 'agendamento';

-- 2. Update trigger function for notifications
CREATE OR REPLACE FUNCTION public.handle_agendamento_notification()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
    v_is_scheduling_enabled BOOLEAN;
BEGIN
    -- Check if notifications for scheduling/tasks are enabled
    SELECT COALESCE(is_enabled, true) INTO v_is_scheduling_enabled 
    FROM public.notification_types 
    WHERE id = 'scheduling';

    IF v_is_scheduling_enabled THEN
        -- Insert into notifications table
        INSERT INTO public.notifications (title, message, type, link)
        VALUES (
            ' Nova Tarefa Atribuída',
            'Você recebeu uma nova tarefa: "' || NEW.assunto || '"',
            'scheduling',
            '/tarefas'
        )
        RETURNING id INTO v_notification_id;

        -- Insert into notification_recipients for the selected user
        IF NEW.usuario_id IS NOT NULL THEN
            INSERT INTO public.notification_recipients (notification_id, user_id, is_read, is_deleted)
            VALUES (v_notification_id, NEW.usuario_id, false, false);
        END IF;

        -- Also notify creator if different from assigned user
        IF NEW.criado_por IS NOT NULL AND NEW.criado_por <> NEW.usuario_id THEN
            INSERT INTO public.notification_recipients (notification_id, user_id, is_read, is_deleted)
            VALUES (v_notification_id, NEW.criado_por, false, false);
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro no trigger handle_agendamento_notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Update RLS Policy for Agendamentos (Tarefas)
-- Only the creator and the assigned user can see/manage the task.
-- Admins are excluded from this strict privacy unless they are the creator or assigned, 
-- but given the project context, we will allow Admins for system maintenance.
-- HOWEVER, the user said "SOMENTE o usuário que atribuiu e o que foi atribuido".
-- I will stick to that strictly first.

DROP POLICY IF EXISTS "Users can manage own agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.agendamentos;

CREATE POLICY "Users can manage own tasks"
ON public.agendamentos
FOR ALL
TO authenticated
USING (
  auth.uid() = usuario_id OR 
  auth.uid() = criado_por
)
WITH CHECK (
  auth.uid() = usuario_id OR 
  auth.uid() = criado_por
);

-- Note: We keep the table name "agendamentos" to avoid massive database refactoring, 
-- but change all user-facing names to "Tarefas".

-- 4. Allow all authenticated users to see basic profile info (needed for task assignment)
DROP POLICY IF EXISTS "Authenticated users can read basic profile info" ON public.profiles;
CREATE POLICY "Authenticated users can read basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
-- Note: We allow reading all columns for now as many features depend on it, 
-- but in a more restrictive environment we might filter the view.
