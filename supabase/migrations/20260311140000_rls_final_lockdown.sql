-- ========================================================
-- SECURITY LOCKDOWN: RLS POLICIES AUDIT & FIX
-- ========================================================

-- Ensure the helper function exists and is properly set
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

-- 1. HONORARIOS (CONFIG)
ALTER TABLE public.honorarios_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view honorarios_config" ON public.honorarios_config;
DROP POLICY IF EXISTS "Users can insert honorarios_config" ON public.honorarios_config;
DROP POLICY IF EXISTS "Users can update honorarios_config" ON public.honorarios_config;

CREATE POLICY "Admins manage honorarios_config" ON public.honorarios_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view assigned honorarios_config" ON public.honorarios_config FOR SELECT USING (public.can_access_empresa(auth.uid(), empresa_id));
CREATE POLICY "Users update assigned honorarios_config" ON public.honorarios_config FOR UPDATE USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 2. HONORARIOS (MENSAL)
ALTER TABLE public.honorarios_mensal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view honorarios_mensal" ON public.honorarios_mensal;
DROP POLICY IF EXISTS "Users can insert honorarios_mensal" ON public.honorarios_mensal;
DROP POLICY IF EXISTS "Users can update honorarios_mensal" ON public.honorarios_mensal;
DROP POLICY IF EXISTS "Users can delete honorarios_mensal" ON public.honorarios_mensal;

CREATE POLICY "Admins manage honorarios_mensal" ON public.honorarios_mensal FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view assigned honorarios_mensal" ON public.honorarios_mensal FOR SELECT USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 3. DECLARACOES ANUAIS
ALTER TABLE public.declaracoes_anuais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view declaracoes_anuais" ON public.declaracoes_anuais;
DROP POLICY IF EXISTS "Users can insert declaracoes_anuais" ON public.declaracoes_anuais;
DROP POLICY IF EXISTS "Users can update declaracoes_anuais" ON public.declaracoes_anuais;
DROP POLICY IF EXISTS "Users can delete declaracoes_anuais" ON public.declaracoes_anuais;

CREATE POLICY "Users access assigned declaracoes_anuais" ON public.declaracoes_anuais FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 4. OCORRENCIAS
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access ocorrencias" ON public.ocorrencias;
DROP POLICY IF EXISTS "Enable view for users with access" ON public.ocorrencias;

CREATE POLICY "Users access assigned ocorrencias" ON public.ocorrencias FOR ALL USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 5. PROCESSOS SOCIETARIOS
ALTER TABLE public.processos_societarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access processos" ON public.processos_societarios;
DROP POLICY IF EXISTS "Users access assigned processos" ON public.processos_societarios;

CREATE POLICY "Users access assigned processos" ON public.processos_societarios FOR ALL USING (
    empresa_id IS NULL OR public.can_access_empresa(auth.uid(), empresa_id)
);

-- 6. APP CONFIG (ADMIN ONLY)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view app_config" ON public.app_config;
DROP POLICY IF EXISTS "Admins can manage app_config" ON public.app_config;

CREATE POLICY "Admins full access app_config" ON public.app_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users read app_config" ON public.app_config FOR SELECT USING (auth.role() = 'authenticated');

-- 7. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.notifications;

-- Notifications are typically global (base) but recipients are private
CREATE POLICY "Authenticated users view notifications" ON public.notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));
