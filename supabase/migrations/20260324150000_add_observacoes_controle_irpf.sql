-- Adiciona campo de observacoes a tabela controle_irpf

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'controle_irpf' AND column_name = 'observacoes'
    ) THEN
        ALTER TABLE controle_irpf ADD COLUMN observacoes TEXT;
    END IF;
END $$;
