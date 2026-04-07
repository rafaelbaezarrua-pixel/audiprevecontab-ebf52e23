-- Migration: Fix Declaracoes Anuais and IRPF schema
-- Adding missing columns to declaracoes_irpf
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'declaracoes_irpf' AND column_name = 'faz_pelo_escritorio') THEN
        ALTER TABLE public.declaracoes_irpf ADD COLUMN faz_pelo_escritorio BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'declaracoes_irpf' AND column_name = 'situacao') THEN
        ALTER TABLE public.declaracoes_irpf ADD COLUMN situacao TEXT DEFAULT 'pendente';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'declaracoes_irpf' AND column_name = 'data_transmissao') THEN
        ALTER TABLE public.declaracoes_irpf ADD COLUMN data_transmissao DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'declaracoes_irpf' AND column_name = 'quem_transmitiu') THEN
        ALTER TABLE public.declaracoes_irpf ADD COLUMN quem_transmitiu TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'declaracoes_irpf' AND column_name = 'observacoes') THEN
        ALTER TABLE public.declaracoes_irpf ADD COLUMN observacoes TEXT;
    END IF;
END $$;

-- Adding missing columns to declaracoes_anuais
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'declaracoes_anuais' AND column_name = 'situacao') THEN
        ALTER TABLE public.declaracoes_anuais ADD COLUMN situacao TEXT DEFAULT 'pendente';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'declaracoes_anuais' AND column_name = 'observacoes') THEN
        ALTER TABLE public.declaracoes_anuais ADD COLUMN observacoes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'declaracoes_anuais' AND column_name = 'data_envio') THEN
        ALTER TABLE public.declaracoes_anuais ADD COLUMN data_envio DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'declaracoes_anuais' AND column_name = 'obrigatorio') THEN
        ALTER TABLE public.declaracoes_anuais ADD COLUMN obrigatorio BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
