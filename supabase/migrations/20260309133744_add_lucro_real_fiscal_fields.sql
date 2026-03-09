-- Add generic Ramo Empresarial
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS ramo_empresarial TEXT;

-- Federal Taxes (IRPJ/CSLL, PIS/COFINS)
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS aliquota_irpj NUMERIC(5,2);
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS aliquota_csll NUMERIC(5,2);
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS irpj_csll_status guia_status DEFAULT 'pendente';
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS irpj_csll_data_envio DATE;

ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS aliquota_pis NUMERIC(5,2);
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS aliquota_cofins NUMERIC(5,2);
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS pis_cofins_status guia_status DEFAULT 'pendente';
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS pis_cofins_data_envio DATE;

-- State Taxes (ICMS)
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS aliquota_icms NUMERIC(5,2);
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS icms_status guia_status DEFAULT 'pendente';
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS icms_data_envio DATE;

-- Municipal Taxes (ISS)
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS aliquota_iss NUMERIC(5,2);
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS iss_status guia_status DEFAULT 'pendente';
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS iss_data_envio DATE;

-- Reforma Tributária - Federal (CBS)
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS aliquota_cbs NUMERIC(5,2);
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS cbs_status guia_status DEFAULT 'pendente';
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS cbs_data_envio DATE;

-- Reforma Tributária - Estadual/Municipal (IBS)
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS aliquota_ibs NUMERIC(5,2);
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS ibs_status guia_status DEFAULT 'pendente';
ALTER TABLE public.fiscal ADD COLUMN IF NOT EXISTS ibs_data_envio DATE;
