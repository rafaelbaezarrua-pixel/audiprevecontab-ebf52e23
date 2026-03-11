-- 1. EXPAND PROCESSOS_SOCIETARIOS TABLE
ALTER TABLE public.processos_societarios 
ADD COLUMN IF NOT EXISTS dbe_deferido BOOLEAN,
ADD COLUMN IF NOT EXISTS assinatura_deferida BOOLEAN,
ADD COLUMN IF NOT EXISTS indeferimento_motivo TEXT,
ADD COLUMN IF NOT EXISTS voltar_para TEXT,
ADD COLUMN IF NOT EXISTS eventos TEXT[],
ADD COLUMN IF NOT EXISTS detalhes_passos JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS current_step TEXT;

-- 3. CREATE PROCESS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.processos_societarios_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id UUID REFERENCES public.processos_societarios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    acao TEXT NOT NULL,
    detalhes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on History
ALTER TABLE public.processos_societarios_historico ENABLE ROW LEVEL SECURITY;

-- 4. FIX PERMISSIVE RLS POLICIES
-- Drop existing public access policies if they are too broad
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow select for all authenticated' AND tablename = 'empresas') THEN
        DROP POLICY "Allow select for all authenticated" ON public.empresas;
    END IF;
END $$;

-- Add more restrictive policies (Example)
-- CREATE POLICY "Users can only see empresas they have access to" ON public.empresas
-- FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_module_permissions WHERE user_id = auth.uid() AND module = 'societario'));

-- 5. ENABLE RLS ON user_module_permissions IF NOT ENABLED
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES FOR HISTORY
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.processos_societarios_historico;
CREATE POLICY "Allow select for authenticated users" ON public.processos_societarios_historico
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.processos_societarios_historico;
CREATE POLICY "Allow insert for authenticated users" ON public.processos_societarios_historico
FOR INSERT TO authenticated WITH CHECK (true);
