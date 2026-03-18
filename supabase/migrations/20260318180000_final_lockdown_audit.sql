-- ========================================================
-- SECURITY LOCKDOWN: FINAL AUDIT RESOLUTION
-- ========================================================
-- Objective: Fix the vulnerabilities identified in the audit:
-- 1. Wide-open RLS on declaracoes_irpf and declaracoes_anuais
-- 2. Wide-open RLS on processos_societarios_historico
-- 3. Insecure 'config' bucket management

-- 1. declaracoes_anuais
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados declaracoes_anuais" ON public.declaracoes_anuais;
DROP POLICY IF EXISTS "Users manage declaracoes_anuais via can_access_empresa" ON public.declaracoes_anuais;

CREATE POLICY "Users manage declaracoes_anuais via can_access_empresa" 
ON public.declaracoes_anuais FOR ALL 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.can_access_empresa(auth.uid(), empresa_id)
);

-- 2. declaracoes_irpf
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados declaracoes_irpf" ON public.declaracoes_irpf;
DROP POLICY IF EXISTS "Users manage declaracoes_irpf via socio access" ON public.declaracoes_irpf;

CREATE POLICY "Users manage declaracoes_irpf via socio access" 
ON public.declaracoes_irpf FOR ALL 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (
        SELECT 1 FROM public.socios s 
        WHERE s.id = socio_id 
        AND public.can_access_empresa(auth.uid(), s.empresa_id)
    )
);

-- 3. processos_societarios_historico
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.processos_societarios_historico;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.processos_societarios_historico;
DROP POLICY IF EXISTS "Users access history via processo access" ON public.processos_societarios_historico;

CREATE POLICY "Users access history via processo access" 
ON public.processos_societarios_historico FOR ALL 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (
        SELECT 1 FROM public.processos_societarios p 
        WHERE p.id = processo_id 
        AND (p.empresa_id IS NULL OR public.can_access_empresa(auth.uid(), p.empresa_id))
    )
);

-- 4. config storage bucket
-- Revoke "Authenticated Manage Config" and make it "Admins Manage Config"
DROP POLICY IF EXISTS "Authenticated Manage Config" ON storage.objects;
DROP POLICY IF EXISTS "Admins Manage Config" ON storage.objects;

CREATE POLICY "Admins Manage Config"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'config' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'config' AND public.has_role(auth.uid(), 'admin'));

-- 5. internal_messages (Double check)
-- Ensure messages are only seen by sender or recipient
-- (Assuming user_id column is the owner/recipient)
-- If it's a shared table, it needs careful RLS. 
-- For now, let's keep it simple as it was likely already handled in its own migration.
