-- Create ocorrencias table
CREATE TABLE IF NOT EXISTS public.ocorrencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    departamento TEXT NOT NULL,
    descricao TEXT NOT NULL,
    usuario_id UUID REFERENCES auth.users(id),
    cidade TEXT DEFAULT 'Fazenda Rio Grande',
    estado TEXT DEFAULT 'PR',
    data_ocorrencia DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.ocorrencias;
CREATE POLICY "Allow all for authenticated users" ON public.ocorrencias
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE public.ocorrencias IS 'Tabela que armazena as ocorrências geradas para as empresas.';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ocorrencias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ocorrencias_modtime ON public.ocorrencias;
CREATE TRIGGER update_ocorrencias_modtime
    BEFORE UPDATE ON public.ocorrencias
    FOR EACH ROW
    EXECUTE PROCEDURE update_ocorrencias_updated_at();
