-- Migration: Add detalhes_calculo to honorarios_mensal
ALTER TABLE public.honorarios_mensal ADD COLUMN IF NOT EXISTS detalhes_calculo JSONB DEFAULT '{}'::jsonb;
