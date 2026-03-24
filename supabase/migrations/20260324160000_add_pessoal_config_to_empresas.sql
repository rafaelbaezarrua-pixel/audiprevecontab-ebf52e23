-- Add Departamento Pessoal configuration columns to empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS possui_funcionarios BOOLEAN DEFAULT false;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS somente_pro_labore BOOLEAN DEFAULT false;
