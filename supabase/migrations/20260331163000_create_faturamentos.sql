-- Create faturamentos table for the billing history
CREATE TABLE IF NOT EXISTS public.faturamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_cliente TEXT NOT NULL,
    valor NUMERIC(15,2) NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    competencia TEXT NOT NULL, -- Format: YYYY-MM
    criado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;

-- Set up RLS Policies
DROP POLICY IF EXISTS "Authenticated users can select faturamentos" ON public.faturamentos;
CREATE POLICY "Authenticated users can select faturamentos"
ON public.faturamentos FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert faturamentos" ON public.faturamentos;
CREATE POLICY "Authenticated users can insert faturamentos"
ON public.faturamentos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = criado_por OR criado_por IS NULL);

DROP POLICY IF EXISTS "Authenticated users can delete faturamentos" ON public.faturamentos;
CREATE POLICY "Authenticated users can delete faturamentos"
ON public.faturamentos FOR DELETE
TO authenticated
USING (true);
