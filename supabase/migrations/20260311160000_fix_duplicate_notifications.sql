-- 20260311160000_fix_duplicate_notifications.sql
-- Remove todos os gatilhos duplicados e garante unicidade nas notificações

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- 1. Remover TODOS os gatilhos da tabela empresas para começar do zero
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'empresas' 
        AND trigger_schema = 'public'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.empresas;';
    END LOOP;
END $$;

-- 2. Atualizar a função de notificação para ser "idempotente" por transação/tempo
CREATE OR REPLACE FUNCTION public.handle_empresa_notification()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
    v_recipient_id UUID;
    v_title TEXT;
    v_message TEXT;
    v_type TEXT := 'company_event';
    v_is_enabled BOOLEAN;
BEGIN
    -- Verifica se notificações para este tipo estão ligadas
    SELECT COALESCE(is_enabled, true) INTO v_is_enabled FROM public.notification_types WHERE id = v_type;
    IF NOT v_is_enabled THEN RETURN NEW; END IF;

    -- Define título e mensagem
    IF (TG_OP = 'INSERT') THEN
        v_title := 'Nova Empresa Cadastrada';
        v_message := 'A empresa ' || NEW.nome_empresa || ' foi cadastrada no sistema.';
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Só notifica se a situação mudou para um estado crítico
        IF (NEW.situacao <> OLD.situacao AND NEW.situacao IN ('paralisada', 'baixada')) THEN
            v_title := 'Situação da Empresa Alterada';
            v_message := 'A situação da empresa ' || NEW.nome_empresa || ' foi alterada para ' || NEW.situacao || '.';
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- GUARDA DE DUPLICIDADE: Evitar criar a mesma notificação (mesma empresa, mesmo título) 
    -- se já foi criada nos últimos 10 segundos. Isso resolve disparos duplos de triggers ou loops.
    IF EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE type = v_type 
        AND title = v_title 
        AND message = v_message
        AND created_at > (now() - interval '10 seconds')
    ) THEN
        RETURN NEW;
    END IF;

    -- Criar a notificação
    INSERT INTO public.notifications (title, message, type, link)
    VALUES (v_title, v_message, v_type, '/empresas')
    RETURNING id INTO v_notification_id;

    -- Enviar para todos os usuários ativos
    INSERT INTO public.notification_recipients (notification_id, user_id)
    SELECT v_notification_id, user_id 
    FROM public.profiles 
    WHERE ativo = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-instalar os gatilhos canônicos da tabela empresas

-- Garantir que a função de update_updated_at existe
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gatilho de Notificação
DROP TRIGGER IF EXISTS on_empresa_event ON public.empresas;
CREATE TRIGGER on_empresa_event
    AFTER INSERT OR UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.handle_empresa_notification();

-- Gatilho de Auditoria (Mantendo o que foi configurado anteriormente)
DROP TRIGGER IF EXISTS trg_audit_empresas ON public.empresas;
CREATE TRIGGER trg_audit_empresas 
    AFTER INSERT OR UPDATE OR DELETE ON public.empresas 
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Gatilho de Updated_at (Padrão do Supabase)
DROP TRIGGER IF EXISTS trg_empresas_updated ON public.empresas;
CREATE TRIGGER trg_empresas_updated 
    BEFORE UPDATE ON public.empresas 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON FUNCTION public.handle_empresa_notification() IS 'Gera notificações de eventos de empresas com proteção contra disparos duplicados.';
