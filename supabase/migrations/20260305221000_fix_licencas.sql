-- Migration to fix Licenças module
-- 1. Add numero_processo to licencas table
ALTER TABLE public.licencas ADD COLUMN IF NOT EXISTS numero_processo TEXT;

-- 2. Create licencas_taxas table
CREATE TABLE IF NOT EXISTS public.licencas_taxas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_licenca TEXT NOT NULL,
    competencia TEXT NOT NULL, -- Format 'YYYY-MM'
    status TEXT NOT NULL DEFAULT 'pendente',
    data_envio DATE,
    forma_envio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Note: In a real environment, you might also want to set up RLS policies for licencas_taxas,
-- but this allows the page to load and work based on standard permissions for now.
