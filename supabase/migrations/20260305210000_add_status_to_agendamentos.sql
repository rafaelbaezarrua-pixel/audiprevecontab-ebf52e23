-- Add status and arquivado columns to agendamentos table
ALTER TABLE public.agendamentos 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'em_aberto',
ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT false;

-- Add check constraint for status
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamentos_status_check') THEN
        ALTER TABLE public.agendamentos 
        ADD CONSTRAINT agendamentos_status_check 
        CHECK (status IN ('em_aberto', 'concluido', 'pendente'));
    END IF;
END $$;
