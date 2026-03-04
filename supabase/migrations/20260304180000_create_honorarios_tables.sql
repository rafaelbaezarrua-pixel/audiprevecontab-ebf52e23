-- Create honorarios_config table
CREATE TABLE IF NOT EXISTS public.honorarios_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    valor_honorario NUMERIC(15, 2) DEFAULT 0,
    valor_por_funcionario NUMERIC(15, 2) DEFAULT 0,
    valor_por_recalculo NUMERIC(15, 2) DEFAULT 0,
    valor_trabalhista NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(empresa_id)
);

-- Enable RLS for honorarios_config
ALTER TABLE public.honorarios_config ENABLE ROW LEVEL SECURITY;

-- Create policies for honorarios_config
CREATE POLICY "Users can view honorarios_config"
    ON public.honorarios_config FOR SELECT
    USING (true);

CREATE POLICY "Users can insert honorarios_config"
    ON public.honorarios_config FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update honorarios_config"
    ON public.honorarios_config FOR UPDATE
    USING (true);

-- Create honorarios_mensal table
CREATE TABLE IF NOT EXISTS public.honorarios_mensal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    competencia TEXT NOT NULL,
    qtd_funcionarios INTEGER DEFAULT 0,
    qtd_recalculos INTEGER DEFAULT 0,
    teve_encargo_trabalhista BOOLEAN DEFAULT false,
    valor_total NUMERIC(15, 2) DEFAULT 0,
    status public.guia_status DEFAULT 'pendente',
    data_vencimento DATE,
    data_envio DATE,
    forma_envio TEXT,
    pago BOOLEAN DEFAULT false,
    observacoes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(empresa_id, competencia)
);

-- Enable RLS for honorarios_mensal
ALTER TABLE public.honorarios_mensal ENABLE ROW LEVEL SECURITY;

-- Create policies for honorarios_mensal
CREATE POLICY "Users can view honorarios_mensal"
    ON public.honorarios_mensal FOR SELECT
    USING (true);

CREATE POLICY "Users can insert honorarios_mensal"
    ON public.honorarios_mensal FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update honorarios_mensal"
    ON public.honorarios_mensal FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete honorarios_mensal"
    ON public.honorarios_mensal FOR DELETE
    USING (true);
