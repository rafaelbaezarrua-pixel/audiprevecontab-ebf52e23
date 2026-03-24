-- Fix: handle_empresa_notification trigger was inserting into notification_recipients
-- for admin user_ids that might no longer exist in auth.users, causing FK violations.
-- Solution: Join with auth.users to only notify valid users, and add exception handling.

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
    SELECT COALESCE(is_enabled, true) INTO v_is_enabled FROM public.notification_types WHERE id = v_type;
    IF NOT v_is_enabled THEN RETURN NEW; END IF;

    IF (TG_OP = 'INSERT') THEN
        v_title := 'Nova Empresa Cadastrada';
        v_message := 'A empresa ' || NEW.nome_empresa || ' foi cadastrada no sistema.';
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.situacao <> OLD.situacao AND NEW.situacao IN ('paralisada', 'baixada')) THEN
            v_title := 'Situação da Empresa Alterada';
            v_message := 'A situação da empresa ' || NEW.nome_empresa || ' foi alterada para ' || NEW.situacao || '.';
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    INSERT INTO public.notifications (title, message, type, link)
    VALUES (v_title, v_message, v_type, '/empresas')
    RETURNING id INTO v_notification_id;

    -- Send to all admins that still exist in auth.users
    FOR v_recipient_id IN (
        SELECT ur.user_id 
        FROM public.user_roles ur
        INNER JOIN auth.users u ON u.id = ur.user_id
        WHERE ur.role = 'admin'
    ) LOOP
        INSERT INTO public.notification_recipients (notification_id, user_id)
        VALUES (v_notification_id, v_recipient_id);
    END LOOP;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro no trigger handle_empresa_notification: %', SQLERRM;
    RETURN NEW; -- Don't block the main operation if notification fails
END;
$$ LANGUAGE plpgsql;

-- Also fix check_expirations function with the same pattern
CREATE OR REPLACE FUNCTION public.check_expirations()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_days_left INTEGER;
    v_notification_id UUID;
    v_recipient_id UUID;
    v_title TEXT;
    v_message TEXT;
    v_type TEXT := 'expiration';
    v_link TEXT;
    v_check_date DATE := CURRENT_DATE;
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS temp_expirations (
        source_table TEXT,
        source_id UUID,
        empresa_nome TEXT,
        documento_tipo TEXT,
        vencimento DATE,
        link TEXT
    ) ON COMMIT DROP;

    DELETE FROM temp_expirations;

    -- Certificados Digitais
    INSERT INTO temp_expirations
    SELECT 'certificados_digitais', c.id, e.nome_empresa, 'Certificado Digital', c.data_vencimento, '/certificados'
    FROM public.certificados_digitais c
    JOIN public.empresas e ON e.id = c.empresa_id
    WHERE c.data_vencimento IS NOT NULL;

    -- Licenças
    INSERT INTO temp_expirations
    SELECT 'licencas', l.id, e.nome_empresa, 'Licença (' || l.tipo_licenca || ')', l.vencimento, '/licencas'
    FROM public.licencas l
    JOIN public.empresas e ON e.id = l.empresa_id
    WHERE l.vencimento IS NOT NULL;

    -- Taxas
    INSERT INTO temp_expirations
    SELECT 'licencas_taxas', t.id, e.nome_empresa, 'Taxa (' || t.tipo_licenca || ')', t.data_vencimento, '/taxas'
    FROM public.licencas_taxas t
    JOIN public.empresas e ON e.id = t.empresa_id
    WHERE t.data_vencimento IS NOT NULL;

    -- Procurações
    INSERT INTO temp_expirations
    SELECT 'procuracoes', p.id, e.nome_empresa, 'Procuração', p.data_vencimento, '/procuracoes'
    FROM public.procuracoes p
    JOIN public.empresas e ON e.id = p.empresa_id
    WHERE p.data_vencimento IS NOT NULL;

    -- Certidões
    INSERT INTO temp_expirations
    SELECT 'certidoes', c.id, e.nome_empresa, 'Certidão (' || c.tipo_certidao || ')', c.vencimento, '/certidoes'
    FROM public.certidoes c
    JOIN public.empresas e ON e.id = c.empresa_id
    WHERE c.vencimento IS NOT NULL;

    -- Iterate and notify
    FOR r IN SELECT * FROM temp_expirations LOOP
        v_days_left := r.vencimento - v_check_date;

        IF v_days_left IN (30, 15, 1, 0) THEN
            v_title := CASE 
                WHEN v_days_left = 0 THEN 'Vencimento Hoje'
                ELSE 'Vencimento em ' || v_days_left || ' dias'
            END;
            
            v_message := r.documento_tipo || ' da empresa ' || r.empresa_nome || ' vence em ' || r.vencimento || '.';

            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE type = v_type 
                AND metadata->>'source_id' = r.source_id::text
                AND metadata->>'days_left' = v_days_left::text
                AND created_at::date = CURRENT_DATE
            ) THEN
                INSERT INTO public.notifications (title, message, type, link, metadata)
                VALUES (v_title, v_message, v_type, r.link, jsonb_build_object('source_id', r.source_id, 'days_left', v_days_left))
                RETURNING id INTO v_notification_id;

                -- Only notify admins that still exist in auth.users
                FOR v_recipient_id IN (
                    SELECT ur.user_id 
                    FROM public.user_roles ur
                    INNER JOIN auth.users u ON u.id = ur.user_id
                    WHERE ur.role = 'admin'
                ) LOOP
                    INSERT INTO public.notification_recipients (notification_id, user_id)
                    VALUES (v_notification_id, v_recipient_id);
                END LOOP;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
