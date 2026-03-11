-- Create controle_irpf table
CREATE TABLE IF NOT EXISTS public.controle_irpf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    ano_exercicio INTEGER NOT NULL,
    valor_a_pagar DECIMAL(12,2) DEFAULT 0,
    status_pago BOOLEAN DEFAULT false,
    data_pagamento DATE,
    status_transmissao TEXT DEFAULT 'pendente', -- 'pendente', 'transmitida'
    data_transmissao DATE,
    transmitido_por TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.controle_irpf ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (simplified for now as per admin requirements)
CREATE POLICY "Authenticated users can manage IRPF" ON public.controle_irpf
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER trg_controle_irpf_updated 
    BEFORE UPDATE ON public.controle_irpf 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add index for performance on year filtering
CREATE INDEX IF NOT EXISTS idx_controle_irpf_ano ON public.controle_irpf(ano_exercicio);
