-- ========================================================
-- AUDIT TRIGGERS - Expansão para Tabelas Recentes
-- ========================================================
-- Adiciona triggers de auditoria em tabelas criadas após
-- a migração original de audit_logs.

DO $$
DECLARE
    _tbl TEXT;
    _tables TEXT[] := ARRAY[
        'faturamentos',
        'relacao_faturamentos',
        'relacao_faturamento_items',
        'documentos_assinaturas',
        'funcionarios',
        'controle_irpf',
        'servicos_esporadicos',
        'declaracoes_anuais',
        'licencas_taxas',
        'tarefas',
        'tickets',
        'document_requests',
        'certificados_digitais',
        'certidoes',
        'procuracoes',
        'agendamentos',
        'parcelamentos',
        'recalculos',
        'internal_messages'
    ];
BEGIN
    FOREACH _tbl IN ARRAY _tables LOOP
        -- Só cria trigger se a tabela existir
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = _tbl) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', _tbl, _tbl);
            EXECUTE format(
                'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.process_audit_log()',
                _tbl, _tbl
            );
            RAISE NOTICE 'Audit trigger created for: %', _tbl;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping', _tbl;
        END IF;
    END LOOP;
END $$;
