-- Create the new Tarefas table for internal tasks
CREATE TABLE IF NOT EXISTS public.tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    horario TIME NOT NULL,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    criado_por UUID REFERENCES auth.users(id),
    assunto TEXT NOT NULL,
    informacoes_adicionais TEXT,
    status TEXT DEFAULT 'em_aberto',
    competencia TEXT,
    arquivado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on tarefas
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Policy: Only creator and assigned user can see/manage
CREATE POLICY "Users can manage own tasks"
ON public.tarefas
FOR ALL
TO authenticated
USING (
  auth.uid() = usuario_id OR 
  auth.uid() = criado_por OR
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = usuario_id OR 
  auth.uid() = criado_por OR
  public.has_role(auth.uid(), 'admin')
);

-- Ensure notification type exists
INSERT INTO public.notification_types (id, label, description, is_enabled)
VALUES ('tasks', 'Tarefas Internas', 'Notifica o usuário quando uma nova tarefa interna é atribuída a ele.', true)
ON CONFLICT (id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Trigger function for Tarefa notifications
CREATE OR REPLACE FUNCTION public.handle_tarefa_notification()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (title, message, type, link)
    VALUES (
        'Nova Tarefa Atribuída',
        'Você recebeu uma nova tarefa interna: "' || NEW.assunto || '"',
        'tasks',
        '/tarefas'
    )
    RETURNING id INTO v_notification_id;

    IF NEW.usuario_id IS NOT NULL THEN
        INSERT INTO public.notification_recipients (notification_id, user_id, is_read, is_deleted)
        VALUES (v_notification_id, NEW.usuario_id, false, false);
    END IF;

    IF NEW.criado_por IS NOT NULL AND NEW.criado_por <> NEW.usuario_id THEN
        INSERT INTO public.notification_recipients (notification_id, user_id, is_read, is_deleted)
        VALUES (v_notification_id, NEW.criado_por, false, false);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_tarefa_created
    AFTER INSERT ON public.tarefas
    FOR EACH ROW EXECUTE FUNCTION public.handle_tarefa_notification();

-- Restore Agendamentos to original meaning (less restrictive RLS as it's for appointments)
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can manage own agendamentos" ON public.agendamentos;

CREATE POLICY "Authenticated users can manage agendamentos"
ON public.agendamentos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure Agendamentos notification type is restored
UPDATE public.notification_types 
SET label = 'Agendamentos', description = 'Notifica o usuário quando um agendamento de atendimento é atribuído.'
WHERE id = 'scheduling' OR id = 'agendamento';
