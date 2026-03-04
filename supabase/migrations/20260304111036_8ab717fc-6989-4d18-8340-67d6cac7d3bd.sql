ALTER TABLE public.pessoal
  ADD COLUMN possui_vc boolean DEFAULT false,
  ADD COLUMN vc_status guia_status DEFAULT 'pendente',
  ADD COLUMN vc_data_envio date,
  ADD COLUMN qtd_recibos integer DEFAULT 0,
  DROP COLUMN recibos_status,
  DROP COLUMN recibos_data_envio;