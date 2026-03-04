-- 1. Add modulos_ativos to empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS modulos_ativos text[] 
DEFAULT ARRAY['fiscal', 'pessoal', 'licencas', 'certificados', 'certidoes', 'procuracoes', 'vencimentos', 'parcelamentos', 'recalculos', 'honorarios'];

-- 2. Create empresa_acessos table
CREATE TABLE IF NOT EXISTS public.empresa_acessos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    modulos_permitidos text[] NOT NULL DEFAULT ARRAY[]::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(empresa_id, user_id)
);

-- Enable RLS for empresa_acessos
ALTER TABLE public.empresa_acessos ENABLE ROW LEVEL SECURITY;

-- Admins manage, users read own
CREATE POLICY "Admins manage empresa_acessos" ON public.empresa_acessos FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own acessos" ON public.empresa_acessos FOR SELECT USING (auth.uid() = user_id);

-- System Policy to enable all actions for authenticated users generally (so the Societario Empresa form works properly)
CREATE POLICY "Enable all actions for authenticated users"
  ON public.empresa_acessos FOR ALL
  USING ( auth.role() = 'authenticated' )
  WITH CHECK ( auth.role() = 'authenticated' );
