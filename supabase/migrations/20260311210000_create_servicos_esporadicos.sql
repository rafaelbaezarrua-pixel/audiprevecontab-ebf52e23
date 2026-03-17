-- Update controle_irpf to include CPF
ALTER TABLE public.controle_irpf ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Create servicos_esporadicos table
CREATE TABLE IF NOT EXISTS public.servicos_esporadicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_cliente TEXT NOT NULL,
    cpf_cnpj TEXT,
    tipo_servico TEXT NOT NULL,
    valor DECIMAL(12,2) DEFAULT 0,
    competencia TEXT NOT NULL, -- YYYY-MM
    pago BOOLEAN DEFAULT false,
    irpf_id UUID REFERENCES public.controle_irpf(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.servicos_esporadicos ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users can manage servicos_esporadicos" ON public.servicos_esporadicos;
CREATE POLICY "Authenticated users can manage servicos_esporadicos" ON public.servicos_esporadicos
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Trigger for update_updated_at
DROP TRIGGER IF EXISTS trg_servicos_esporadicos_updated ON public.servicos_esporadicos;
CREATE TRIGGER trg_servicos_esporadicos_updated 
    BEFORE UPDATE ON public.servicos_esporadicos 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to sync IRPF to servicos_esporadicos
CREATE OR REPLACE FUNCTION public.sync_irpf_to_honorarios()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.servicos_esporadicos (
        nome_cliente,
        cpf_cnpj,
        tipo_servico,
        valor,
        competencia,
        pago,
        irpf_id
    ) VALUES (
        NEW.nome_completo,
        NEW.cpf,
        'IRPF ' || NEW.ano_exercicio,
        COALESCE(NEW.valor_a_pagar, 0),
        TO_CHAR(COALESCE(NEW.data_transmissao, CURRENT_DATE), 'YYYY-MM'),
        NEW.status_pago,
        NEW.id
    )
    ON CONFLICT (irpf_id) DO UPDATE SET
        nome_cliente = EXCLUDED.nome_cliente,
        cpf_cnpj = EXCLUDED.cpf_cnpj,
        valor = EXCLUDED.valor,
        pago = EXCLUDED.pago;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on controle_irpf
DROP TRIGGER IF EXISTS trg_sync_irpf_honorarios ON public.controle_irpf;
CREATE TRIGGER trg_sync_irpf_honorarios
    AFTER INSERT OR UPDATE ON public.controle_irpf
    FOR EACH ROW EXECUTE FUNCTION public.sync_irpf_to_honorarios();
