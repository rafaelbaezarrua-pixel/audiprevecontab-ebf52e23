
-- Add new fields to socios table for better partner management
ALTER TABLE public.socios 
ADD COLUMN IF NOT EXISTS percentual_cotas NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_entrada DATE,
ADD COLUMN IF NOT EXISTS data_saida DATE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS telefone TEXT;

-- Index for searching partners by CPF
CREATE INDEX IF NOT EXISTS idx_socios_cpf ON public.socios(cpf);
