-- Add departamento to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS departamento TEXT;

-- Update existing profiles with a default value if needed (optional)
-- UPDATE public.profiles SET departamento = 'Geral' WHERE departamento IS NULL;

COMMENT ON COLUMN public.profiles.departamento IS 'Departamento ao qual o usuário pertence (Societário, Fiscal, Pessoal, etc).';
