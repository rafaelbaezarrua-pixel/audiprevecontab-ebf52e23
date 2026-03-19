-- ========================================================
-- SECURITY LOCKDOWN: COMPLETE RLS ARMORING
-- ========================================================
-- Date: 2026-03-19
-- Objective: Ensure that non-admin users (clients) can ONLY see data 
-- from companies they are explicitly authorized to access via empresa_acessos.

-- 1. EMPRESAS
DROP POLICY IF EXISTS "Authenticated users access empresas" ON public.empresas;
CREATE POLICY "Admins manage everything empresas" 
ON public.empresas FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view authorized empresas" 
ON public.empresas FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.empresa_acessos WHERE user_id = auth.uid() AND empresa_id = id));

-- 2. SOCIOS
DROP POLICY IF EXISTS "Authenticated users access socios" ON public.socios;
CREATE POLICY "Admins manage everything socios" ON public.socios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view authorized socios" ON public.socios FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 3. LICENCAS
DROP POLICY IF EXISTS "Authenticated users access licencas" ON public.licencas;
CREATE POLICY "Admins manage everything licencas" ON public.licencas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view authorized licencas" ON public.licencas FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 4. CERTIDOES
DROP POLICY IF EXISTS "Authenticated users access certidoes" ON public.certidoes;
CREATE POLICY "Admins manage everything certidoes" ON public.certidoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view authorized certidoes" ON public.certidoes FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 5. PROCURACOES
DROP POLICY IF EXISTS "Authenticated users access procuracoes" ON public.procuracoes;
CREATE POLICY "Admins manage everything procuracoes" ON public.procuracoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view authorized procuracoes" ON public.procuracoes FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 6. CERTIFICADOS DIGITAIS
DROP POLICY IF EXISTS "Authenticated users access certificados" ON public.certificados_digitais;
CREATE POLICY "Admins manage everything certificados" ON public.certificados_digitais FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view authorized certificados" ON public.certificados_digitais FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 7. FISCAL
DROP POLICY IF EXISTS "Authenticated users access fiscal" ON public.fiscal;
CREATE POLICY "Admins manage everything fiscal" ON public.fiscal FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view authorized fiscal" ON public.fiscal FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 8. PESSOAL
DROP POLICY IF EXISTS "Authenticated users access pessoal" ON public.pessoal;
CREATE POLICY "Admins manage everything pessoal" ON public.pessoal FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view authorized pessoal" ON public.pessoal FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id));

-- 9. PARCELAMENTOS
DROP POLICY IF EXISTS "Authenticated users access parcelamentos" ON public.parcelamentos;
CREATE POLICY "Admins manage everything parcelamentos" ON public.parcelamentos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view authorized parcelamentos" ON public.parcelamentos FOR SELECT TO authenticated USING (
    empresa_id IS NULL OR public.can_access_empresa(auth.uid(), empresa_id)
);

-- 10. NOTIFICATIONS LOCKDOWN
-- Ensure users only see notifications sent to them
DROP POLICY IF EXISTS "Anyone can read system notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Admins manage everything notifications" 
ON public.notifications FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their own notifications" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.notification_recipients 
        WHERE notification_id = id AND user_id = auth.uid()
    )
);

-- 11. CLEANUP: Ensure RLS is enabled on all core tables
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certidoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
