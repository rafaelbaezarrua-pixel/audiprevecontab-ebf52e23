-- Definitively fix all foreign keys referencing auth.users or public.profiles to use ON DELETE CASCADE
-- This ensures that when a user is deleted via Supabase Auth Admin, no child record blocks the deletion.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. Check for references to auth.users without CASCADE
    FOR r IN (
        SELECT 
            tc.table_schema,
            tc.table_name, 
            kcu.column_name, 
            tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu 
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
          AND rc.delete_rule = 'NO ACTION'
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.table_schema, r.table_name, r.constraint_name);
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE', r.table_schema, r.table_name, r.constraint_name, r.column_name);
    END LOOP;

    -- 2. Check for references to public.profiles without CASCADE
    FOR r IN (
        SELECT 
            tc.table_schema,
            tc.table_name, 
            kcu.column_name, 
            tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu 
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_schema = 'public'
          AND ccu.table_name = 'profiles'
          AND rc.delete_rule = 'NO ACTION'
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.table_schema, r.table_name, r.constraint_name);
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(user_id) ON DELETE CASCADE', r.table_schema, r.table_name, r.constraint_name, r.column_name);
    END LOOP;
END $$;
