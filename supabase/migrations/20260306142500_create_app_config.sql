-- Create app_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Set up policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_config' AND policyname = 'All read config'
    ) THEN
        CREATE POLICY "All read config" ON public.app_config 
        FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_config' AND policyname = 'Admins write config'
    ) THEN
        -- Using direct subquery to avoid dependency on has_role function
        CREATE POLICY "Admins write config" ON public.app_config 
        FOR ALL TO authenticated USING (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role = 'admin'::public.app_role
            )
        );
    END IF;

    -- Backup policy for all authenticated users to manage config if no roles are set yet
    -- This helps during initial setup
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_config' AND policyname = 'Authenticated users manage config'
    ) THEN
        CREATE POLICY "Authenticated users manage config" ON public.app_config 
        FOR ALL TO authenticated USING (true);
    END IF;
END $$;

COMMENT ON TABLE public.app_config IS 'Configurações globais do sistema (ex: cabeçalho de PDFs, cores, etc).';
