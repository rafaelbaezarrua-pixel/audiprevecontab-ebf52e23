
-- Create table for employee management and alerts
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    cpf TEXT,
    data_admissao DATE,
    cargo TEXT,
    vencimento_ferias DATE, -- Data limite para gozo ou vencimento do período aquisitivo
    data_ultimo_aso DATE,
    vencimento_aso DATE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users access funcionarios" 
ON public.funcionarios FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Trigger for update_updated_at
CREATE TRIGGER trg_funcionarios_updated 
BEFORE UPDATE ON public.funcionarios 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa_id ON public.funcionarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_vencimento_aso ON public.funcionarios(vencimento_aso) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_funcionarios_vencimento_ferias ON public.funcionarios(vencimento_ferias) WHERE ativo = true;
