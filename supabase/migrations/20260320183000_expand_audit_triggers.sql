-- ========================================================
-- ADVANCED SECURITY: COMPREHENSIVE AUDIT TRIGGERS (EXPANSION)
-- ========================================================
-- Objective: Expand audit logging to all sensitive tables that were previously unmonitored.

DO $$
DECLARE
    _tbl TEXT;
    _tables TEXT[] := ARRAY[
        'empresas',
        'empresa_acessos',
        'honorarios_config',
        'honorarios_mensal',
        'internal_messages',
        'licencas_taxas',
        'ocorrencias',
        'parcelamentos_mensal',
        'processos_societarios'
    ];
BEGIN
    FOR _tbl IN SELECT unnest(_tables) LOOP
        -- Skip if table doesn't exist (safety)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = _tbl) THEN
            -- Using a standardized naming convention for ease of management
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', _tbl, _tbl);
            EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.process_audit_log()', _tbl, _tbl);
        END IF;
    END LOOP;
END $$;
