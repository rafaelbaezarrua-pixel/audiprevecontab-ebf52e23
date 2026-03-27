-- Add empresa_id to tarefas table
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- Update RLS to allow seeing tasks for accessible companies (optional, but good for consistency)
-- For now, we'll keep the existing policy as it's already quite broad for admins
