-- Migration to fix Parcelamentos schema and add monthly tracking
-- 1. Add missing columns to parcelamentos table
ALTER TABLE public.parcelamentos ADD COLUMN IF NOT EXISTS encerrado BOOLEAN DEFAULT false;
ALTER TABLE public.parcelamentos ADD COLUMN IF NOT EXISTS metodo_login TEXT DEFAULT 'procuracao';
ALTER TABLE public.parcelamentos ADD COLUMN IF NOT EXISTS login_gov_br TEXT;
ALTER TABLE public.parcelamentos ADD COLUMN IF NOT EXISTS senha_gov_br TEXT;
ALTER TABLE public.parcelamentos ADD COLUMN IF NOT EXISTS codigo_sn TEXT;

-- 2. Create parcelamentos_mensal table for monthly status tracking
CREATE TABLE IF NOT EXISTS public.parcelamentos_mensal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parcelamento_id UUID REFERENCES public.parcelamentos(id) ON DELETE CASCADE,
    competencia TEXT NOT NULL, -- Format 'YYYY-MM'
    status TEXT NOT NULL DEFAULT 'pendente',
    data_envio DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(parcelamento_id, competencia)
);

-- 3. Enable RLS and add policies
ALTER TABLE public.parcelamentos_mensal ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'parcelamentos_mensal' AND policyname = 'Authenticated users access parcelamentos_mensal'
    ) THEN
        CREATE POLICY "Authenticated users access parcelamentos_mensal" 
        ON public.parcelamentos_mensal FOR ALL 
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;
