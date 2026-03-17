-- ========================================================
-- SECURITY LOCKDOWN: STORAGE RLS POLICIES (ANTI-LEAK)
-- ========================================================

-- RLS on storage.objects should be enabled via Supabase Dashboard if not already active
-- as the postgres user might not have permission to ALTER the table properties directly.


-- Drop any potentially insecure default policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;

-- 1. Admins have full access to all storage objects
DROP POLICY IF EXISTS "Admins full access storage" ON storage.objects;
CREATE POLICY "Admins full access storage" 
ON storage.objects FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- BUCKET: CERTIDOES
-- ==========================================
-- The file name is typically strictly the certidao ID + extension (e.g., uuid.pdf)
-- We extract the ID using split_part(name, '.', 1) and check ownership via the certidoes table.

DROP POLICY IF EXISTS "Users read certidoes" ON storage.objects;
CREATE POLICY "Users read certidoes" ON storage.objects FOR SELECT 
USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'certidoes' AND 
    EXISTS (
        SELECT 1 FROM public.certidoes c 
        WHERE c.id::text = split_part(name, '.', 1) 
        AND public.can_access_empresa(auth.uid(), c.empresa_id)
    )
);

DROP POLICY IF EXISTS "Users insert certidoes" ON storage.objects;
CREATE POLICY "Users insert certidoes" ON storage.objects FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id = 'certidoes' AND 
    EXISTS (
        SELECT 1 FROM public.certidoes c 
        WHERE c.id::text = split_part(name, '.', 1) 
        AND public.can_access_empresa(auth.uid(), c.empresa_id)
    )
);

DROP POLICY IF EXISTS "Users update certidoes" ON storage.objects;
CREATE POLICY "Users update certidoes" ON storage.objects FOR UPDATE 
USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'certidoes' AND 
    EXISTS (
        SELECT 1 FROM public.certidoes c 
        WHERE c.id::text = split_part(name, '.', 1) 
        AND public.can_access_empresa(auth.uid(), c.empresa_id)
    )
);

DROP POLICY IF EXISTS "Users delete certidoes" ON storage.objects;
CREATE POLICY "Users delete certidoes" ON storage.objects FOR DELETE 
USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'certidoes' AND 
    EXISTS (
        SELECT 1 FROM public.certidoes c 
        WHERE c.id::text = split_part(name, '.', 1) 
        AND public.can_access_empresa(auth.uid(), c.empresa_id)
    )
);


-- ==========================================
-- BUCKET: LICENCAS
-- ==========================================
DROP POLICY IF EXISTS "Users read licencas" ON storage.objects;
CREATE POLICY "Users read licencas" ON storage.objects FOR SELECT 
USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'licencas' AND 
    EXISTS (
        SELECT 1 FROM public.licencas l 
        WHERE l.id::text = split_part(name, '.', 1) 
        AND public.can_access_empresa(auth.uid(), l.empresa_id)
    )
);

DROP POLICY IF EXISTS "Users insert licencas" ON storage.objects;
CREATE POLICY "Users insert licencas" ON storage.objects FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id = 'licencas' AND 
    EXISTS (
        SELECT 1 FROM public.licencas l 
        WHERE l.id::text = split_part(name, '.', 1) 
        AND public.can_access_empresa(auth.uid(), l.empresa_id)
    )
);

DROP POLICY IF EXISTS "Users update licencas" ON storage.objects;
CREATE POLICY "Users update licencas" ON storage.objects FOR UPDATE 
USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'licencas' AND 
    EXISTS (
        SELECT 1 FROM public.licencas l 
        WHERE l.id::text = split_part(name, '.', 1) 
        AND public.can_access_empresa(auth.uid(), l.empresa_id)
    )
);

DROP POLICY IF EXISTS "Users delete licencas" ON storage.objects;
CREATE POLICY "Users delete licencas" ON storage.objects FOR DELETE 
USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'licencas' AND 
    EXISTS (
        SELECT 1 FROM public.licencas l 
        WHERE l.id::text = split_part(name, '.', 1) 
        AND public.can_access_empresa(auth.uid(), l.empresa_id)
    )
);
