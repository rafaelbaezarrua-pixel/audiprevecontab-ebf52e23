-- 20260311170000_consolidated_final_fix.sql
-- UNIFICAÇÃO DE AUDITORIA, NOTIFICAÇÕES E PERFIS
-- Este script resolve erros de funções ausentes, duplicidade de notificações e joins de auditoria.

-- ============================================
-- 1. FUNÇÕES DE UTILIDADE E INFRAESTRUTURA
-- ============================================

-- Função padrão para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. AJUSTES NA TABELA PROFILES (EMAIL SYNC)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_user_email ON auth.users;
CREATE TRIGGER trg_sync_user_email AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();

-- Sincronização inicial de emails
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE p.user_id = u.id AND p.email IS NULL;

-- ============================================
-- 3. SISTEMA DE AUDITORIA (audit_logs)
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id), -- Referência original para auth.users
    profile_id UUID, -- Coluna auxiliar para facilitar joins se necessário, ou use a FK abaixo
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB
);

-- Garantir que a FK aponte para profiles para joins simples via PostgREST
-- Primeiro removemos FKs antigas se existirem para evitar conflitos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'audit_logs_user_id_fkey') THEN
        ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_user_id_fkey;
    END IF;
END $$;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access audit_logs" ON public.audit_logs;
CREATE POLICY "Admins full access audit_logs" ON public.audit_logs
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Função de Log de Auditoria
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
BEGIN
    _user_id := auth.uid();
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
        VALUES (_user_id, TG_OP, TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (_user_id, TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
        VALUES (_user_id, TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- ============================================
-- 4. SISTEMA DE NOTIFICAÇÕES (DEDUPLICAÇÃO)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_empresa_notification()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
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

    -- Proteção contra duplicidade (10 segundos)
    IF EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE type = v_type AND title = v_title AND message = v_message
        AND created_at > (now() - interval '10 seconds')
    ) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (title, message, type, link)
    VALUES (v_title, v_message, v_type, '/empresas')
    RETURNING id INTO v_notification_id;

    INSERT INTO public.notification_recipients (notification_id, user_id)
    SELECT v_notification_id, user_id FROM public.profiles WHERE ativo = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. RE-INSTALAÇÃO DE GATILHOS (RESET TOTAL)
-- ============================================

DO $$
DECLARE
    _tbl TEXT;
    _tables TEXT[] := ARRAY['empresas', 'honorarios_config', 'honorarios_mensal', 'ocorrencias', 'processos_societarios'];
BEGIN
    FOREACH _tbl IN ARRAY _tables LOOP
        -- Remove gatilhos antigos para evitar duplicações/erros
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', _tbl, _tbl);
        EXECUTE format('DROP TRIGGER IF EXISTS on_empresa_event ON public.%I', _tbl);
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', _tbl, _tbl);
        
        -- Instala gatilho de auditoria
        EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.process_audit_log()', _tbl, _tbl);
        
        -- Instala gatilho de updated_at
        EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', _tbl, _tbl);
    END LOOP;
    
    -- Gatilho de notificação específico para empresas
    CREATE TRIGGER on_empresa_event AFTER INSERT OR UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.handle_empresa_notification();
END $$;

COMMENT ON TABLE public.audit_logs IS 'Central de Auditoria AudiPreve';
