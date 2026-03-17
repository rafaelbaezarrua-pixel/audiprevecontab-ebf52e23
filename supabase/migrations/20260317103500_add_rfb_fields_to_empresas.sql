-- Add new fields to empresas table for RFB consultation data
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
ADD COLUMN IF NOT EXISTS capital_social NUMERIC,
ADD COLUMN IF NOT EXISTS cnae_fiscal INTEGER,
ADD COLUMN IF NOT EXISTS cnae_fiscal_descricao TEXT,
ADD COLUMN IF NOT EXISTS email_rfb TEXT,
ADD COLUMN IF NOT EXISTS telefone_rfb TEXT,
ADD COLUMN IF NOT EXISTS qsa JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS info_rfb_completa JSONB DEFAULT '{}';

-- Update comment for the new columns
COMMENT ON COLUMN public.empresas.nome_fantasia IS 'Nome fantasia retornado pela consulta RFB';
COMMENT ON COLUMN public.empresas.capital_social IS 'Capital social da empresa';
COMMENT ON COLUMN public.empresas.cnae_fiscal IS 'CNAE fiscal principal';
COMMENT ON COLUMN public.empresas.cnae_fiscal_descricao IS 'Descrição do CNAE fiscal principal';
COMMENT ON COLUMN public.empresas.email_rfb IS 'E-mail cadastrado na RFB';
COMMENT ON COLUMN public.empresas.telefone_rfb IS 'Telefone cadastrado na RFB';
COMMENT ON COLUMN public.empresas.qsa IS 'Quadro de Sócios e Administradores retornado pela RFB';
COMMENT ON COLUMN public.empresas.info_rfb_completa IS 'Objeto JSON completo com todos os dados da consulta BrazilAPI';
