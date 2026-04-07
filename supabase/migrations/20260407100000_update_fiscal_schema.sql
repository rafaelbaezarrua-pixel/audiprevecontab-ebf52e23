-- Update guia_status enum to include 'ok'
ALTER TYPE guia_status ADD VALUE IF NOT EXISTS 'ok';

-- Add xml_status column to fiscal table
ALTER TABLE fiscal ADD COLUMN IF NOT EXISTS xml_status guia_status DEFAULT 'pendente';
