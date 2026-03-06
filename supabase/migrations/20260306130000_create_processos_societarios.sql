-- Migration to create processos_societarios table
CREATE TABLE IF NOT EXISTS public.processos_societarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo TEXT NOT NULL, -- abertura, alteracao, baixa, abertura_mei, baixa_mei
    nome_empresa TEXT, -- Para aberturas
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL, -- Para processos de empresas existentes
    numero_processo TEXT,
    data_inicio DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'em_andamento', -- em_andamento, concluido
    
    -- Linha do Tempo (Datas de conclusão de cada etapa)
    envio_dbe_at TIMESTAMP WITH TIME ZONE,
    envio_fcn_at TIMESTAMP WITH TIME ZONE,
    envio_contrato_at TIMESTAMP WITH TIME ZONE,
    envio_taxa_at TIMESTAMP WITH TIME ZONE,
    assinatura_contrato_at TIMESTAMP WITH TIME ZONE,
    arquivamento_junta_at TIMESTAMP WITH TIME ZONE,
    
    -- Controle de Divergências (Exigência / Deferimento)
    foi_deferido BOOLEAN DEFAULT FALSE,
    foi_arquivado BOOLEAN DEFAULT FALSE,
    em_exigencia BOOLEAN DEFAULT FALSE,
    exigencia_motivo TEXT,
    exigencia_respondida BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Habilitar RLS (Opcional, seguindo o padrão do projeto)
ALTER TABLE public.processos_societarios ENABLE ROW LEVEL SECURITY;

-- Política simples para permitir acesso a todos os usuários autenticados
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.processos_societarios;
CREATE POLICY "Allow all for authenticated users" ON public.processos_societarios
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Função e Trigger para updated_at
CREATE OR REPLACE FUNCTION update_processos_societarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_processos_societarios_modtime ON public.processos_societarios;
CREATE TRIGGER update_processos_societarios_modtime
    BEFORE UPDATE ON public.processos_societarios
    FOR EACH ROW
    EXECUTE PROCEDURE update_processos_societarios_updated_at();
