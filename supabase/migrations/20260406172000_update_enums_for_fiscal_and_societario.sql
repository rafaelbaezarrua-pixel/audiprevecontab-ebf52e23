-- Add 'isento' to guia_status enum
ALTER TYPE guia_status ADD VALUE IF NOT EXISTS 'isento';

-- Add new situations to empresa_situacao enum
ALTER TYPE empresa_situacao ADD VALUE IF NOT EXISTS 'inapta';
ALTER TYPE empresa_situacao ADD VALUE IF NOT EXISTS 'suspensa';
ALTER TYPE empresa_situacao ADD VALUE IF NOT EXISTS 'nula';
