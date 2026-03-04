ALTER TABLE public.pessoal
  ADD COLUMN possui_recibos boolean DEFAULT false,
  ADD COLUMN recibos_status guia_status DEFAULT 'pendente',
  ADD COLUMN recibos_data_envio date;