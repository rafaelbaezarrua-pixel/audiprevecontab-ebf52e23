-- Migration to fix additional user deletion blockers
-- This adds ON DELETE CASCADE to tables not covered by the previous migration

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. Fix public.audit_logs (user_id)
    -- This table was created later and needs cascade delete
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
        FOR r IN (
            SELECT tc.constraint_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
            AND tc.table_name = 'audit_logs' 
            AND kcu.column_name = 'user_id'
        ) LOOP
            EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.audit_logs 
        ADD CONSTRAINT audit_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;

    -- 2. Fix public.processos_societarios_historico (usuario_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'processos_societarios_historico' AND table_schema = 'public') THEN
        FOR r IN (
            SELECT tc.constraint_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
            AND tc.table_name = 'processos_societarios_historico' 
            AND kcu.column_name = 'usuario_id'
        ) LOOP
            EXECUTE 'ALTER TABLE public.processos_societarios_historico DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.processos_societarios_historico 
        ADD CONSTRAINT processos_societarios_historico_usuario_id_fkey 
        FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

END $$;
