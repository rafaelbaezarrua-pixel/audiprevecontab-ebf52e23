-- Objective: Allow all authenticated users to manage servicos_esporadicos.

-- 1. servicos_esporadicos
DROP POLICY IF EXISTS "Admins full access servicos_esporadicos" ON public.servicos_esporadicos;
DROP POLICY IF EXISTS "Authenticated users can manage servicos_esporadicos" ON public.servicos_esporadicos;
DROP POLICY IF EXISTS "All authenticated users manage servicos_esporadicos" ON public.servicos_esporadicos;

CREATE POLICY "All authenticated users manage servicos_esporadicos" 
ON public.servicos_esporadicos FOR ALL 
USING (auth.uid() IS NOT NULL);
