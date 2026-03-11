-- Add unique constraint to irpf_id in servicos_esporadicos
ALTER TABLE public.servicos_esporadicos ADD CONSTRAINT servicos_esporadicos_irpf_id_key UNIQUE (irpf_id);
