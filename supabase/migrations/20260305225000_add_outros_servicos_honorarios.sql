-- Migration: Add outros_servicos to honorarios_config
ALTER TABLE public.honorarios_config ADD COLUMN IF NOT EXISTS outros_servicos JSONB DEFAULT '[]'::jsonb;
