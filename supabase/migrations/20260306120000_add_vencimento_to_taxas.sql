-- Migration to add data_vencimento to licencas_taxas
ALTER TABLE public.licencas_taxas ADD COLUMN IF NOT EXISTS data_vencimento DATE;
