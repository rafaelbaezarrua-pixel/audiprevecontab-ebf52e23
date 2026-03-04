ALTER TABLE public.recalculos ADD COLUMN parcelamento_id uuid REFERENCES public.parcelamentos(id);
ALTER TABLE public.recalculos ALTER COLUMN empresa_id DROP NOT NULL;
