-- Migration to add Simples Nacional and MEI option details
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS opcao_pelo_simples BOOLEAN,
ADD COLUMN IF NOT EXISTS data_opcao_pelo_simples DATE,
ADD COLUMN IF NOT EXISTS opcao_pelo_mei BOOLEAN,
ADD COLUMN IF NOT EXISTS data_opcao_pelo_mei DATE,
ADD COLUMN IF NOT EXISTS porte_rfb TEXT;

-- Comments for the new columns
COMMENT ON COLUMN public.empresas.opcao_pelo_simples IS 'Indica se a empresa é optante pelo Simples Nacional';
COMMENT ON COLUMN public.empresas.data_opcao_pelo_simples IS 'Data de opção pelo Simples Nacional';
COMMENT ON COLUMN public.empresas.opcao_pelo_mei IS 'Indica se a empresa é optante pelo SIMEI (MEI)';
COMMENT ON COLUMN public.empresas.data_opcao_pelo_mei IS 'Data de opção pelo SIMEI (MEI)';
COMMENT ON COLUMN public.empresas.porte_rfb IS 'Descrição textual do porte retornado pela RFB';
