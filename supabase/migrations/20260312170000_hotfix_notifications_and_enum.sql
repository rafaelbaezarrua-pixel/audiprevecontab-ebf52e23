-- 1. Sync Enums
DO $$ BEGIN
    -- empresa_situacao: add 'entregue'
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'empresa_situacao' AND e.enumlabel = 'entregue') THEN
        ALTER TYPE public.empresa_situacao ADD VALUE 'entregue';
    END IF;
    
    -- app_role: add 'client' (missing in some versions)
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'client') THEN
        ALTER TYPE public.app_role ADD VALUE 'client';
    END IF;
END $$;

-- 2. Sync Roles in user_roles table
-- Ensure admins are synced
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE (raw_user_meta_data->>'role' = 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure clients are synced (newly added 'client' role)
-- We check for both 'client' and 'cliente' labels to avoid uniqueness errors if one already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'client'::public.app_role
FROM auth.users
WHERE (raw_user_meta_data->>'role' IN ('client', 'cliente') OR raw_user_meta_data->>'empresa_id' IS NOT NULL)
ON CONFLICT (user_id, role) DO NOTHING;

-- Cleanup: If a user has both 'client' AND 'user' roles, we remove the generic 'user' role.
-- This prevents the "duplicate key" error if we ever try to upgrade them.
DELETE FROM public.user_roles
WHERE role = 'user'::public.app_role
AND user_id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'client'::public.app_role
);

-- 3. Ensure Timestamp Columns for Triggers
-- This function ensures that common columns like created_at and updated_at exist
CREATE OR REPLACE FUNCTION public.ensure_timestamp_columns(table_name_text TEXT)
RETURNS void AS $$
BEGIN
    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name_text AND column_name = 'created_at') THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN created_at TIMESTAMPTZ DEFAULT now()', table_name_text);
    END IF;
    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name_text AND column_name = 'updated_at') THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now()', table_name_text);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables tracked by audit or updating triggers
DO $$
DECLARE
    _tbl TEXT;
    _tables TEXT[] := ARRAY[
        'empresas', 'honorarios_config', 'honorarios_mensal', 'ocorrencias', 
        'processos_societarios', 'licencas', 'certificados_digitais', 'pessoal', 
        'procuracoes', 'certidoes', 'parcelamentos', 'profiles', 'user_roles',
        'internal_messages', 'audit_logs', 'notifications', 'notification_recipients'
    ];
BEGIN
    FOREACH _tbl IN ARRAY _tables LOOP
        PERFORM public.ensure_timestamp_columns(_tbl);
    END LOOP;
END $$;

-- 3. Fix Notification RLS (Addressing 401/400 errors)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read system notifications" ON public.notifications;
CREATE POLICY "Anyone can read system notifications" ON public.notifications
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage their own notification links" ON public.notification_recipients;
CREATE POLICY "Users can manage their own notification links" ON public.notification_recipients
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Robust Update Trigger Function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if updated_at column exists in the record to avoid crashes
    -- In PL/pgSQL, we can't easily check record fields dynamically without cost,
    -- but since we ensured the column exists above, this should now be safe.
    NEW.updated_at = now();
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback: If for some reason NEW.updated_at fails, just return the record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
