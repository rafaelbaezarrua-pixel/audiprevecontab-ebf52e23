-- Migration: Add missing columns to certidoes table
-- Date: 2026-03-19

DO $$ 
BEGIN
    -- Add observacao if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certidoes' AND column_name = 'observacao') THEN
        ALTER TABLE public.certidoes ADD COLUMN observacao TEXT;
    END IF;

    -- Add arquivo_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certidoes' AND column_name = 'arquivo_url') THEN
        ALTER TABLE public.certidoes ADD COLUMN arquivo_url TEXT;
    END IF;

    -- Add created_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certidoes' AND column_name = 'created_at') THEN
        ALTER TABLE public.certidoes ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certidoes' AND column_name = 'updated_at') THEN
        ALTER TABLE public.certidoes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Ensure updated_at trigger exists
DROP TRIGGER IF EXISTS trg_certidoes_updated ON public.certidoes;
CREATE TRIGGER trg_certidoes_updated 
BEFORE UPDATE ON public.certidoes 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
