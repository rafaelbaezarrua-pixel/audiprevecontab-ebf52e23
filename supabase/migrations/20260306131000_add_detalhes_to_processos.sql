-- Add detalhes_passos JSONB to store sender and observations for each step
ALTER TABLE public.processos_societarios 
ADD COLUMN IF NOT EXISTS detalhes_passos JSONB DEFAULT '{}'::jsonb;

-- Comment on column for clarity
COMMENT ON COLUMN public.processos_societarios.detalhes_passos IS 'Armazena detalhes como "enviado_por" e "observacoes" para cada etapa do processo.';
