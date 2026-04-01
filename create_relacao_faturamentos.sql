-- Script para criar a tabela de histórico de Relações de Faturamento Real
-- Execute este script no SQL Editor do seu painel Supabase

CREATE TABLE IF NOT EXISTS public.relacao_faturamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    nome_empresa TEXT NOT NULL,
    periodo_inicio TEXT NOT NULL, -- Formato YYYY-MM
    periodo_fim TEXT NOT NULL,    -- Formato YYYY-MM
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    itens JSONB NOT NULL,         -- Array de {id, mes, ano, valor}
    valor_total NUMERIC(15, 2) NOT NULL,
    criado_por UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.relacao_faturamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Usuários autenticados podem ver relações" 
    ON public.relacao_faturamentos FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Usuários autenticados podem inserir relações" 
    ON public.relacao_faturamentos FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem excluir relações" 
    ON public.relacao_faturamentos FOR DELETE 
    TO authenticated 
    USING (true);
