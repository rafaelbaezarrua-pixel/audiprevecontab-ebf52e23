-- Add 'entregue' to empresa_situacao enum
ALTER TYPE empresa_situacao ADD VALUE IF NOT EXISTS 'entregue';
