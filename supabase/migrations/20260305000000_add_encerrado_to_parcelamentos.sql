-- Add `encerrado` flag to parcelamentos
ALTER TABLE parcelamentos ADD COLUMN IF NOT EXISTS encerrado BOOLEAN DEFAULT false;
