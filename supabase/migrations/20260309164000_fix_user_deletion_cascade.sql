-- Migration to fix user deletion error by adding ON DELETE CASCADE to foreign keys
-- This ensures that when an auth.user is deleted, related records are also removed.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. Fix public.ocorrencias (usuario_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ocorrencias' AND table_schema = 'public') THEN
        -- Drop any existing FK on this column to auth.users
        FOR r IN (
            SELECT tc.constraint_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
            AND tc.table_name = 'ocorrencias' 
            AND kcu.column_name = 'usuario_id'
            AND (ccu.table_schema = 'auth' OR ccu.table_name = 'users') -- Relaxed check
        ) LOOP
            EXECUTE 'ALTER TABLE public.ocorrencias DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
        
        -- Explicitly drop the target name to avoid "already exists" error
        ALTER TABLE public.ocorrencias DROP CONSTRAINT IF EXISTS ocorrencias_usuario_id_fkey;

        ALTER TABLE public.ocorrencias 
        ADD CONSTRAINT ocorrencias_usuario_id_fkey 
        FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 2. Fix public.agendamentos (usuario_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agendamentos' AND table_schema = 'public') THEN
        FOR r IN (
            SELECT tc.constraint_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
            AND tc.table_name = 'agendamentos' 
            AND kcu.column_name = 'usuario_id'
            AND (ccu.table_schema = 'auth' OR ccu.table_name = 'users')
        ) LOOP
            EXECUTE 'ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_usuario_id_fkey;

        ALTER TABLE public.agendamentos 
        ADD CONSTRAINT agendamentos_usuario_id_fkey 
        FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 3. Fix public.notification_recipients (user_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_recipients' AND table_schema = 'public') THEN
        FOR r IN (
            SELECT tc.constraint_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
            AND tc.table_name = 'notification_recipients' 
            AND kcu.column_name = 'user_id'
            AND (ccu.table_schema = 'auth' OR ccu.table_name = 'users')
        ) LOOP
            EXECUTE 'ALTER TABLE public.notification_recipients DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.notification_recipients DROP CONSTRAINT IF EXISTS notification_recipients_user_id_fkey;

        ALTER TABLE public.notification_recipients 
        ADD CONSTRAINT notification_recipients_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

END $$;
