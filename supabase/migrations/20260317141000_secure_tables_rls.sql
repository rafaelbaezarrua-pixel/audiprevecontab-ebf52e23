-- ========================================================
-- SECURITY LOCKDOWN: TABLE RLS POLICIES (ANTI-LEAK)
-- ========================================================
-- Objective: Secure tables that were created with overly permissive 
-- "Authenticated users can manage" policies (which allow any user to see 
-- any other user's data).

-- 1. controle_irpf
-- Currently has: CREATE POLICY "Authenticated users can manage IRPF" ON public.controle_irpf FOR ALL USING (auth.uid() IS NOT NULL);
-- This is insecure. Since IRPF does not have an empresa_id or user_id mapping yet, 
-- we STRICTLY limit this to ADMINS to prevent data leaks between clients.

DROP POLICY IF EXISTS "Authenticated users can manage IRPF" ON public.controle_irpf;
DROP POLICY IF EXISTS "Admins full access controle_irpf" ON public.controle_irpf;
CREATE POLICY "Admins full access controle_irpf" 
ON public.controle_irpf FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));


-- 2. servicos_esporadicos
-- Currently has: CREATE POLICY "Authenticated users can manage servicos_esporadicos" ON public.servicos_esporadicos FOR ALL USING (auth.uid() IS NOT NULL);
-- Same issue: no empresa_id mapping. Must be strictly admin-only for now.

DROP POLICY IF EXISTS "Authenticated users can manage servicos_esporadicos" ON public.servicos_esporadicos;
DROP POLICY IF EXISTS "Admins full access servicos_esporadicos" ON public.servicos_esporadicos;
CREATE POLICY "Admins full access servicos_esporadicos" 
ON public.servicos_esporadicos FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Note: In the future, if users need to see their own IRPF/Esporadicos, 
-- a user_id or empresa_id column MUST be added and policies updated to use public.can_access_empresa.
