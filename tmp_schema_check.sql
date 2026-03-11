-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'controle_irpf'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'servicos_esporadicos'
ORDER BY ordinal_position;
