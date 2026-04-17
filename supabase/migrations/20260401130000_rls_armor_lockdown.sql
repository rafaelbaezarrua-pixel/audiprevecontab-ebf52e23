-- ========================================================
-- RLS ARMOR LOCKDOWN - Blindagem Total de Segurança
-- ========================================================
-- Date: 2026-04-01
-- Objetivo: Eliminar TODAS as políticas permissivas (USING true)
-- e garantir isolamento por empresa + papel admin/user.

-- =============================================
-- 1. FATURAMENTOS (CRÍTICO - estava aberto)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can select faturamentos" ON public.faturamentos;
DROP POLICY IF EXISTS "Authenticated users can insert faturamentos" ON public.faturamentos;
DROP POLICY IF EXISTS "Authenticated users can delete faturamentos" ON public.faturamentos;

CREATE POLICY "Admins full access faturamentos"
ON public.faturamentos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 2. HONORÁRIOS CONFIG (estava aberto)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read honorarios_config" ON public.honorarios_config;
DROP POLICY IF EXISTS "Authenticated users can update honorarios_config" ON public.honorarios_config;
DROP POLICY IF EXISTS "Authenticated users can insert honorarios_config" ON public.honorarios_config;
DROP POLICY IF EXISTS "Authenticated users can delete honorarios_config" ON public.honorarios_config;

ALTER TABLE public.honorarios_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access honorarios_config"
ON public.honorarios_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read assigned honorarios_config"
ON public.honorarios_config FOR SELECT
TO authenticated
USING (public.can_access_empresa(auth.uid(), empresa_id));

-- =============================================
-- 3. HONORÁRIOS MENSAL (estava aberto)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read honorarios_mensal" ON public.honorarios_mensal;
DROP POLICY IF EXISTS "Authenticated users can update honorarios_mensal" ON public.honorarios_mensal;
DROP POLICY IF EXISTS "Authenticated users can insert honorarios_mensal" ON public.honorarios_mensal;
DROP POLICY IF EXISTS "Authenticated users can delete honorarios_mensal" ON public.honorarios_mensal;

ALTER TABLE public.honorarios_mensal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access honorarios_mensal"
ON public.honorarios_mensal FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read assigned honorarios_mensal"
ON public.honorarios_mensal FOR SELECT
TO authenticated
USING (public.can_access_empresa(auth.uid(), empresa_id));

-- =============================================
-- 4. DECLARAÇÕES ANUAIS (estava USING true FOR ALL)
-- =============================================
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados declaracoes_anuais" ON public.declaracoes_anuais;

ALTER TABLE public.declaracoes_anuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access declaracoes_anuais"
ON public.declaracoes_anuais FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read assigned declaracoes_anuais"
ON public.declaracoes_anuais FOR SELECT
TO authenticated
USING (public.can_access_empresa(auth.uid(), empresa_id));

-- =============================================
-- 5. DECLARAÇÕES IRPF (estava USING true FOR ALL)
-- =============================================
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados declaracoes_irpf" ON public.declaracoes_irpf;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'declaracoes_irpf') THEN
    EXECUTE 'ALTER TABLE public.declaracoes_irpf ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Admins full access declaracoes_irpf" ON public.declaracoes_irpf FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================
-- 6. CONTROLE IRPF
-- =============================================
DROP POLICY IF EXISTS "Authenticated users access controle_irpf" ON public.controle_irpf;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'controle_irpf') THEN
    EXECUTE 'ALTER TABLE public.controle_irpf ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Admins full access controle_irpf" ON public.controle_irpf FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================
-- 7. SERVIÇOS ESPORÁDICOS
-- =============================================
DROP POLICY IF EXISTS "Authenticated users access servicos_esporadicos" ON public.servicos_esporadicos;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'servicos_esporadicos') THEN
    EXECUTE 'ALTER TABLE public.servicos_esporadicos ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Admins full access servicos_esporadicos" ON public.servicos_esporadicos FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
    -- servicos_esporadicos não tem empresa_id, então fica admin-only por enquanto
  END IF;
END $$;

-- =============================================
-- 8. APP_CONFIG (SELECT público, escrita só admin)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read app_config" ON public.app_config;
DROP POLICY IF EXISTS "Authenticated users can manage app_config" ON public.app_config;
DROP POLICY IF EXISTS "app_config_select" ON public.app_config;
DROP POLICY IF EXISTS "app_config_all" ON public.app_config;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read app_config"
ON public.app_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify app_config"
ON public.app_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 9. TAREFAS (só vê suas próprias ou se admin)
-- =============================================
DROP POLICY IF EXISTS "Users can view all tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Authenticated users view tarefas" ON public.tarefas;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarefas') THEN
    EXECUTE 'ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access tarefas" ON public.tarefas';
    EXECUTE 'CREATE POLICY "Admins full access tarefas" ON public.tarefas FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'DROP POLICY IF EXISTS "Users view own tarefas" ON public.tarefas';
    EXECUTE 'CREATE POLICY "Users view own tarefas" ON public.tarefas FOR SELECT TO authenticated USING (criado_por = auth.uid() OR usuario_id = auth.uid())';
  END IF;
END $$;

-- =============================================
-- 10. DOCUMENTOS E ASSINATURAS
-- =============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_assinaturas') THEN
    EXECUTE 'ALTER TABLE public.documentos_assinaturas ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access documentos_assinaturas" ON public.documentos_assinaturas';
    EXECUTE 'CREATE POLICY "Admins full access documentos_assinaturas" ON public.documentos_assinaturas FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'DROP POLICY IF EXISTS "Users read assigned documentos_assinaturas" ON public.documentos_assinaturas';
    EXECUTE 'CREATE POLICY "Users read assigned documentos_assinaturas" ON public.documentos_assinaturas FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id))';
  END IF;
END $$;

-- =============================================
-- 11. FUNCIONÁRIOS
-- =============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'funcionarios') THEN
    EXECUTE 'ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access funcionarios" ON public.funcionarios';
    EXECUTE 'CREATE POLICY "Admins full access funcionarios" ON public.funcionarios FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'DROP POLICY IF EXISTS "Users read assigned funcionarios" ON public.funcionarios';
    EXECUTE 'CREATE POLICY "Users read assigned funcionarios" ON public.funcionarios FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id))';
  END IF;
END $$;

-- =============================================
-- 12. TICKETS E DOCUMENT REQUESTS
-- =============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
    EXECUTE 'ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access tickets" ON public.tickets';
    EXECUTE 'CREATE POLICY "Admins full access tickets" ON public.tickets FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'DROP POLICY IF EXISTS "Users view own tickets" ON public.tickets';
    EXECUTE 'CREATE POLICY "Users view own tickets" ON public.tickets FOR SELECT TO authenticated USING (usuario_id = auth.uid())';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_requests') THEN
    EXECUTE 'ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access document_requests" ON public.document_requests';
    EXECUTE 'CREATE POLICY "Admins full access document_requests" ON public.document_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================
-- 13. RELAÇÃO FATURAMENTOS
-- =============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relacao_faturamentos') THEN
    EXECUTE 'ALTER TABLE public.relacao_faturamentos ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access relacao_faturamentos" ON public.relacao_faturamentos';
    EXECUTE 'CREATE POLICY "Admins full access relacao_faturamentos" ON public.relacao_faturamentos FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relacao_faturamento_items') THEN
    EXECUTE 'ALTER TABLE public.relacao_faturamento_items ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access relacao_faturamento_items" ON public.relacao_faturamento_items';
    EXECUTE 'CREATE POLICY "Admins full access relacao_faturamento_items" ON public.relacao_faturamento_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================
-- 14. MENSAGENS INTERNAS
-- =============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_messages') THEN
    EXECUTE 'ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access internal_messages" ON public.internal_messages';
    EXECUTE 'CREATE POLICY "Admins full access internal_messages" ON public.internal_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'DROP POLICY IF EXISTS "Users view own messages" ON public.internal_messages';
    EXECUTE 'CREATE POLICY "Users view own messages" ON public.internal_messages FOR SELECT TO authenticated USING (recipient_id = auth.uid() OR sender_id = auth.uid())';
  END IF;
END $$;

-- =============================================
-- 15. PROFILES (usuários só veem o próprio)
-- =============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated" ON public.profiles;

DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
CREATE POLICY "Admins full access profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- =============================================
-- 16. LICENÇAS TAXAS
-- =============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'licencas_taxas') THEN
    EXECUTE 'ALTER TABLE public.licencas_taxas ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access licencas_taxas" ON public.licencas_taxas';
    EXECUTE 'CREATE POLICY "Admins full access licencas_taxas" ON public.licencas_taxas FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'DROP POLICY IF EXISTS "Users read assigned licencas_taxas" ON public.licencas_taxas';
    EXECUTE 'CREATE POLICY "Users read assigned licencas_taxas" ON public.licencas_taxas FOR SELECT TO authenticated USING (public.can_access_empresa(auth.uid(), empresa_id))';
  END IF;
END $$;

-- =============================================
-- 17. AGENDAMENTOS
-- =============================================
DROP POLICY IF EXISTS "Users can view all agendamentos" ON public.agendamentos;

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access agendamentos"
ON public.agendamentos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read assigned agendamentos"
ON public.agendamentos FOR SELECT
TO authenticated
USING (public.can_access_empresa(auth.uid(), empresa_id));
