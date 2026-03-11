-- 20260311150000_setup_audit_logs.sql
-- Implementação do Sistema de Log de Auditoria Centralizado e Ajuste de Perfil

-- 1. Garantir que a tabela profiles tenha o email (para facilitar joins na Auditoria)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Função e Trigger para sincronizar email do auth.users para public.profiles
CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_user_email ON auth.users;
CREATE TRIGGER trg_sync_user_email
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();

-- Sincronização inicial
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- 3. Criação da tabela de logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES public.profiles(user_id), -- Aponta para profiles para join fácil
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB
);

-- Ativar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissões (Somente Admins podem ver a auditoria completa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins full access audit_logs' AND tablename = 'audit_logs') THEN
        CREATE POLICY "Admins full access audit_logs" ON public.audit_logs
        FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 4. Função genérica de log de auditoria
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
    _user_id := auth.uid();

    IF (TG_OP = 'DELETE') THEN
        _old_data := to_jsonb(OLD);
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
        VALUES (_user_id, TG_OP, TG_TABLE_NAME, OLD.id::text, _old_data);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        _old_data := to_jsonb(OLD);
        _new_data := to_jsonb(NEW);
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (_user_id, TG_OP, TG_TABLE_NAME, NEW.id::text, _old_data, _new_data);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        _new_data := to_jsonb(NEW);
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
        VALUES (_user_id, TG_OP, TG_TABLE_NAME, NEW.id::text, _new_data);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- 5. Aplicação dos Triggers nas tabelas críticas
DO $$
DECLARE
    _tbl TEXT;
    _tables TEXT[] := ARRAY['empresas', 'honorarios_config', 'honorarios_mensal', 'ocorrencias', 'processos_societarios'];
BEGIN
    FOREACH _tbl IN ARRAY _tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', _tbl, _tbl);
        EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.process_audit_log()', _tbl, _tbl);
    END LOOP;
END $$;

COMMENT ON TABLE public.audit_logs IS 'Armazena log de auditoria de alterações em tabelas críticas (DML).';
