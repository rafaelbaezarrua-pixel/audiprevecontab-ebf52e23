-- Create GIN index for fast array searches on modulos_ativos
CREATE INDEX IF NOT EXISTS idx_empresas_modulos_ativos ON public.empresas USING gin (modulos_ativos);

-- Create index for faster access control lookups
CREATE INDEX IF NOT EXISTS idx_empresa_acessos_user_id ON public.empresa_acessos (user_id);
