
-- Tabela para controle de declarações anuais das empresas
CREATE TABLE IF NOT EXISTS public.declaracoes_anuais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    tipo_declaracao TEXT NOT NULL, -- 'defis', 'ecd_ecf', 'dasn_simei', 'dirf'
    obrigatorio BOOLEAN DEFAULT FALSE,
    enviada BOOLEAN DEFAULT FALSE,
    data_envio DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(empresa_id, ano, tipo_declaracao)
);

-- Tabela para controle de declarações IRPF dos sócios
CREATE TABLE IF NOT EXISTS public.declaracoes_irpf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    socio_id UUID NOT NULL REFERENCES public.socios(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    faz_pelo_escritorio BOOLEAN DEFAULT FALSE,
    transmitida BOOLEAN DEFAULT FALSE,
    data_transmissao DATE,
    quem_transmitiu TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(socio_id, ano)
);

-- Habilitar RLS
ALTER TABLE public.declaracoes_anuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declaracoes_irpf ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso simples (todos autenticados podem ler e escrever por enquanto, seguindo padrão das outras tabelas)
CREATE POLICY "Permitir tudo para usuários autenticados declaracoes_anuais" ON public.declaracoes_anuais FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados declaracoes_irpf" ON public.declaracoes_irpf FOR ALL TO authenticated USING (true);
