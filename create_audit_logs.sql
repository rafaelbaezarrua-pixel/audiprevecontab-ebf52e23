-- Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB
);

-- Função genérica para criar logs de auditoria
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Tenta pegar o user_id do auth.uid(), útil quando a query vem da interface (API/Client)
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, new_data, user_id)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW), v_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Somente loga se algo realmente mudou
    IF row_to_json(OLD) IS DISTINCT FROM row_to_json(NEW) THEN
      INSERT INTO public.audit_logs (action, table_name, record_id, old_data, new_data, user_id)
      VALUES ('UPDATE', TG_TABLE_NAME, OLD.id, row_to_json(OLD), row_to_json(NEW), v_user_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, old_data, user_id)
    VALUES ('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD), v_user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitando RLS para a tabela de logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- As Policies permitirão:
-- 1. Inserção automática vinda da API/DB (não estrita via client policy, o trigger roda com security definer)
-- 2. Leitura apenas por Administradores.
CREATE POLICY "Admins podem ler audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Atribuir triggers as tabelas cruciais do sistema
-- Empresas
CREATE TRIGGER audit_empresas_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.empresas
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- Pessoal
CREATE TRIGGER audit_pessoal_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.pessoal
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- Fiscal
CREATE TRIGGER audit_fiscal_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.fiscal
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- Processos Societários
CREATE TRIGGER audit_processos_societarios_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.processos_societarios
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- Honorarios
CREATE TRIGGER audit_honorarios_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.honorarios
FOR EACH ROW EXECUTE FUNCTION process_audit_log();
