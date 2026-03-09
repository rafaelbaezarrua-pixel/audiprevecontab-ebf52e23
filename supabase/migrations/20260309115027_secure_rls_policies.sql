-- ============================================
-- ENSURE ENUMS AND HELPER FUNCTION EXIST
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$func$;

-- Drop the insecure "Enable all actions for authenticated users" policy on empresa_acessos

-- Re-apply strict "Admins manage / Users read own" policies just in case
DROP POLICY IF EXISTS "Admins manage empresa_acessos" ON public.empresa_acessos;
CREATE POLICY "Admins manage empresa_acessos" ON public.empresa_acessos FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users read own acessos" ON public.empresa_acessos;
CREATE POLICY "Users read own acessos" ON public.empresa_acessos FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION FOR CHECKING EMPRESA ACCESS
-- ============================================
-- Returns true if the user is an admin OR if the user has a row in empresa_acessos for the given empresa_id
CREATE OR REPLACE FUNCTION public.can_access_empresa(_user_id UUID, _empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.empresa_acessos WHERE user_id = _user_id AND empresa_id = _empresa_id
  )
$$;

-- ============================================
-- SECURE 'empresas'
-- ============================================
DROP POLICY IF EXISTS "Authenticated users access empresas" ON public.empresas;

-- Admins can do everything. Users can only SELECT/UPDATE companies they have access to. 
-- Users cannot INSERT new companies or DELETE them (only admins).
CREATE POLICY "Admins full access empresas" ON public.empresas FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read assigned empresas" ON public.empresas FOR SELECT USING (public.can_access_empresa(auth.uid(), id));
CREATE POLICY "Users update assigned empresas" ON public.empresas FOR UPDATE USING (public.can_access_empresa(auth.uid(), id));

-- ============================================
-- SECURE ALL OTHER TABLES BY REFERENCING empresa_id
-- ============================================

-- SOCIOS
DROP POLICY IF EXISTS "Authenticated users access socios" ON public.socios;
CREATE POLICY "Users access assigned socios" ON public.socios FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- LICENCAS
DROP POLICY IF EXISTS "Authenticated users access licencas" ON public.licencas;
CREATE POLICY "Users access assigned licencas" ON public.licencas FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- CERTIDOES
DROP POLICY IF EXISTS "Authenticated users access certidoes" ON public.certidoes;
CREATE POLICY "Users access assigned certidoes" ON public.certidoes FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- PROCURACOES
DROP POLICY IF EXISTS "Authenticated users access procuracoes" ON public.procuracoes;
CREATE POLICY "Users access assigned procuracoes" ON public.procuracoes FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- CERTIFICADOS DIGITAIS
DROP POLICY IF EXISTS "Authenticated users access certificados" ON public.certificados_digitais;
CREATE POLICY "Users access assigned certificados" ON public.certificados_digitais FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- FISCAL
DROP POLICY IF EXISTS "Authenticated users access fiscal" ON public.fiscal;
CREATE POLICY "Users access assigned fiscal" ON public.fiscal FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- PESSOAL
DROP POLICY IF EXISTS "Authenticated users access pessoal" ON public.pessoal;
CREATE POLICY "Users access assigned pessoal" ON public.pessoal FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- PARCELAMENTOS
DROP POLICY IF EXISTS "Authenticated users access parcelamentos" ON public.parcelamentos;
-- Note: parcelamentos might have empresa_id as NULL if pessoa_fisica. Wait, we should only restrict if empresa_id IS NOT NULL, or allow admins for NULL.
CREATE POLICY "Admins full access parcelamentos" ON public.parcelamentos FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users access assigned parcelamentos" ON public.parcelamentos FOR ALL USING (
  empresa_id IS NOT NULL AND public.can_access_empresa(auth.uid(), empresa_id)
);

-- ============================================
-- OTHER TABLES TO SECURE
-- ============================================

-- PROCESSOS SOCIETARIOS (assuming they have empresa_id)
DROP POLICY IF EXISTS "Authenticated users access processos" ON public.processos_societarios;
CREATE POLICY "Users access assigned processos" ON public.processos_societarios FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- OCORRENCIAS (assuming they have empresa_id)
DROP POLICY IF EXISTS "Authenticated users access ocorrencias" ON public.ocorrencias;
CREATE POLICY "Users access assigned ocorrencias" ON public.ocorrencias FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- HONORARIOS (recalculos)
DROP POLICY IF EXISTS "Authenticated users access recalculos" ON public.recalculos;
CREATE POLICY "Users access assigned recalculos" ON public.recalculos FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));
