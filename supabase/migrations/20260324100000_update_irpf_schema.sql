-- Migration: Update IRPF schema and RLS
-- Add forma_pagamento column
ALTER TABLE public.controle_irpf ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

-- Rename transmitido_por to feito_por
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controle_irpf' AND column_name = 'transmitido_por') THEN
        ALTER TABLE public.controle_irpf RENAME COLUMN transmitido_por TO feito_por;
    END IF;
END $$;

-- Update RLS to allow all authenticated users
DROP POLICY IF EXISTS "Admins full access controle_irpf" ON public.controle_irpf;
DROP POLICY IF EXISTS "Authenticated users can manage IRPF" ON public.controle_irpf;

CREATE POLICY "All authenticated users manage IRPF" 
ON public.controle_irpf FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Add audit triggers if not already present (from previous conversation)
-- (Assuming they were added in 20260320183000_expand_audit_triggers.sql)
