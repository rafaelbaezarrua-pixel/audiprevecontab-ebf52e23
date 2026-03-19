-- Add more BrasilAPI fields to empresas table
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS data_exclusao_simples DATE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS data_exclusao_simei DATE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS opcao_pelo_simples BOOLEAN DEFAULT FALSE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS data_opcao_pelo_simples DATE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS opcao_pelo_mei BOOLEAN DEFAULT FALSE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS data_opcao_pelo_mei DATE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS porte_rfb TEXT;

COMMENT ON COLUMN empresas.data_exclusao_simples IS 'Data de exclusão do Simples Nacional obtida via BrasilAPI';
COMMENT ON COLUMN empresas.data_exclusao_simei IS 'Data de exclusão do SIMEI obtida via BrasilAPI';
COMMENT ON COLUMN empresas.opcao_pelo_simples IS 'Indica se a empresa é optante pelo Simples Nacional';
COMMENT ON COLUMN empresas.data_opcao_pelo_simples IS 'Data de opção pelo Simples Nacional';
COMMENT ON COLUMN empresas.opcao_pelo_mei IS 'Indica se a empresa é optante pelo SIMEI';
COMMENT ON COLUMN empresas.data_opcao_pelo_mei IS 'Data de opção pelo SIMEI';
COMMENT ON COLUMN empresas.porte_rfb IS 'Porte da empresa conforme base da Receita Federal';
