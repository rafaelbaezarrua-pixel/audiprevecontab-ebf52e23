-- ========================================================
-- ADVANCED SECURITY: COMPREHENSIVE AUDIT TRIGGERS
-- ========================================================
-- Objective: Expand audit logging to all sensitive tables in the system.

-- 1. Ensure the process_audit_log function exists (it should from previous migration, but let's be safe)
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _old_data JSONB := NULL;
    _new_data JSONB := NULL;
BEGIN
    -- Try to get the authenticated user ID
    BEGIN
        _user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        _user_id := NULL;
    END;
    
    -- For DELETE operations
    IF (TG_OP = 'DELETE') THEN
        _old_data := to_jsonb(OLD);
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
        VALUES (_user_id, TG_OP, TG_TABLE_NAME, OLD.id::text, _old_data);
        RETURN OLD;
        
    -- For UPDATE operations
    ELSIF (TG_OP = 'UPDATE') THEN
        _old_data := to_jsonb(OLD);
        _new_data := to_jsonb(NEW);
        
        -- Only log if data actually changed
        IF (_old_data != _new_data) THEN
            INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
            VALUES (_user_id, TG_OP, TG_TABLE_NAME, NEW.id::text, _old_data, _new_data);
        END IF;
        RETURN NEW;
        
    -- For INSERT operations
    ELSIF (TG_OP = 'INSERT') THEN
        _new_data := to_jsonb(NEW);
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
        VALUES (_user_id, TG_OP, TG_TABLE_NAME, NEW.id::text, _new_data);
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 2. Apply Triggers to all sensitive tables
DO $$
DECLARE
    _tbl TEXT;
    _tables TEXT[] := ARRAY[
        'pessoal', 
        'fiscal', 
        'declaracoes_irpf', 
        'declaracoes_anuais', 
        'controle_irpf', 
        'servicos_esporadicos', 
        'certificados_digitais', 
        'procuracoes', 
        'licencas', 
        'certidoes', 
        'agendamentos',
        'recalculos',
        'parcelamentos',
        'socios',
        'profiles',
        'user_roles',
        'user_module_permissions'
    ];
BEGIN
    FOREACH _tbl IN ARRAY _tables LOOP
        -- Skip if table doesn't exist (safety)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = _tbl) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', _tbl, _tbl);
            EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.process_audit_log()', _tbl, _tbl);
        END IF;
    END LOOP;
END $$;

-- 3. Enable Realtime for audit_logs
-- This allows the UI to subscribe to new logs live.
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
-- Ensure the table is in the supabase_realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
        EXCEPTION WHEN OTHERS THEN
            -- Publication might already have the table or not exist in this environment
            NULL;
        END;
    END IF;
END $$;
