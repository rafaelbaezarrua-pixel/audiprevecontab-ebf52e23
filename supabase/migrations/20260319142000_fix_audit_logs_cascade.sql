-- Fix audit_logs foreign key to allow user deletion
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_logs_user_id_fkey' 
        AND table_name = 'audit_logs'
    ) THEN
        ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_user_id_fkey;
    END IF;
END $$;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL; -- We might want to keep the logs but detach the user

-- Alternatively, if we want to delete logs when user is deleted:
-- ON DELETE CASCADE;

-- Let's check other potential blockers pointing to profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'profiles'
          AND ccu.column_name = 'user_id'
          AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(user_id) ON DELETE CASCADE', r.table_name, r.constraint_name, r.column_name);
    END LOOP;
END $$;
