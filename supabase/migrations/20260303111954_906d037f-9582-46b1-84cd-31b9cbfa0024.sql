
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.empresa_situacao AS ENUM ('ativa', 'paralisada', 'baixada');
CREATE TYPE public.regime_tributario AS ENUM ('simples', 'lucro_presumido', 'lucro_real', 'mei');
CREATE TYPE public.licenca_tipo AS ENUM ('definitiva', 'dispensada', 'com_vencimento', 'em_processo');
CREATE TYPE public.guia_status AS ENUM ('pendente', 'gerada', 'enviada');

-- ============================================
-- PROFILES (auto-created on signup)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome_completo TEXT,
  cpf TEXT,
  telefone TEXT,
  data_nascimento DATE,
  foto_url TEXT,
  endereco JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER ROLES
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER: has_role
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================
-- EMPRESAS (core entity)
-- ============================================
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  data_abertura DATE,
  porte_empresa TEXT,
  regime_tributario regime_tributario DEFAULT 'simples',
  natureza_juridica TEXT,
  situacao empresa_situacao DEFAULT 'ativa',
  endereco JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SOCIOS
-- ============================================
CREATE TABLE public.socios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  administrador BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LICENCAS MUNICIPAIS
-- ============================================
CREATE TABLE public.licencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  tipo_licenca TEXT NOT NULL, -- alvara, vigilancia_sanitaria, corpo_bombeiros, meio_ambiente
  status licenca_tipo,
  vencimento DATE,
  numero_processo TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.licencas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CERTIDOES NEGATIVAS
-- ============================================
CREATE TABLE public.certidoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  tipo_certidao TEXT NOT NULL,
  vencimento DATE,
  arquivo_url TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.certidoes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROCURACOES
-- ============================================
CREATE TABLE public.procuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  data_cadastro DATE,
  data_vencimento DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.procuracoes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CERTIFICADOS DIGITAIS
-- ============================================
CREATE TABLE public.certificados_digitais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  data_vencimento DATE,
  tipo_emissao TEXT, -- videoconferencia, presencial
  socio_responsavel_id UUID REFERENCES public.socios(id) ON DELETE SET NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.certificados_digitais ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FISCAL
-- ============================================
CREATE TABLE public.fiscal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  competencia TEXT, -- YYYY-MM
  tipo_nota TEXT, -- nfe, nfce, nfse
  recebimento_arquivos TEXT, -- email, whatsapp, iss_fly, comprove, outros
  forma_envio TEXT,
  aliquota NUMERIC(5,2),
  status_guia guia_status DEFAULT 'pendente',
  data_envio DATE,
  observacoes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fiscal ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PESSOAL (mensal por empresa)
-- ============================================
CREATE TABLE public.pessoal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  competencia TEXT NOT NULL, -- YYYY-MM
  forma_envio TEXT,
  qtd_funcionarios INTEGER DEFAULT 0,
  qtd_pro_labore INTEGER DEFAULT 0,
  possui_vt BOOLEAN DEFAULT false,
  possui_va BOOLEAN DEFAULT false,
  vt_status guia_status DEFAULT 'pendente',
  vt_data_envio DATE,
  va_status guia_status DEFAULT 'pendente',
  va_data_envio DATE,
  inss_status guia_status DEFAULT 'pendente',
  inss_data_envio DATE,
  fgts_status guia_status DEFAULT 'pendente',
  fgts_data_envio DATE,
  dctf_web_gerada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, competencia)
);
ALTER TABLE public.pessoal ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARCELAMENTOS
-- ============================================
CREATE TABLE public.parcelamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT NOT NULL, -- empresa, pessoa_fisica
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  nome_pessoa_fisica TEXT,
  cpf_pessoa_fisica TEXT,
  tipo_parcelamento TEXT, -- previdenciario, simples_nacional, mei, irpf, divida_ativa, icms, outros
  data_inicio DATE,
  qtd_parcelas INTEGER,
  previsao_termino DATE,
  forma_envio TEXT,
  data_envio DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.parcelamentos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER MODULE PERMISSIONS
-- ============================================
CREATE TABLE public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_name TEXT NOT NULL,
  UNIQUE(user_id, module_name)
);
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CONFIG (logos, etc)
-- ============================================
CREATE TABLE public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_empresas_updated BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_licencas_updated BEFORE UPDATE ON public.licencas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_certidoes_updated BEFORE UPDATE ON public.certidoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_procuracoes_updated BEFORE UPDATE ON public.procuracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_certificados_updated BEFORE UPDATE ON public.certificados_digitais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_fiscal_updated BEFORE UPDATE ON public.fiscal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_pessoal_updated BEFORE UPDATE ON public.pessoal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_parcelamentos_updated BEFORE UPDATE ON public.parcelamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles: users see/edit own, admins see all
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts profile" ON public.profiles FOR INSERT WITH CHECK (true);

-- User roles: admins manage, users read own
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Empresas: all authenticated users can CRUD (internal system)
CREATE POLICY "Authenticated users access empresas" ON public.empresas FOR ALL USING (auth.uid() IS NOT NULL);

-- Socios
CREATE POLICY "Authenticated users access socios" ON public.socios FOR ALL USING (auth.uid() IS NOT NULL);

-- Licencas
CREATE POLICY "Authenticated users access licencas" ON public.licencas FOR ALL USING (auth.uid() IS NOT NULL);

-- Certidoes
CREATE POLICY "Authenticated users access certidoes" ON public.certidoes FOR ALL USING (auth.uid() IS NOT NULL);

-- Procuracoes
CREATE POLICY "Authenticated users access procuracoes" ON public.procuracoes FOR ALL USING (auth.uid() IS NOT NULL);

-- Certificados digitais
CREATE POLICY "Authenticated users access certificados" ON public.certificados_digitais FOR ALL USING (auth.uid() IS NOT NULL);

-- Fiscal
CREATE POLICY "Authenticated users access fiscal" ON public.fiscal FOR ALL USING (auth.uid() IS NOT NULL);

-- Pessoal
CREATE POLICY "Authenticated users access pessoal" ON public.pessoal FOR ALL USING (auth.uid() IS NOT NULL);

-- Parcelamentos
CREATE POLICY "Authenticated users access parcelamentos" ON public.parcelamentos FOR ALL USING (auth.uid() IS NOT NULL);

-- User module permissions: admins manage, users read own
CREATE POLICY "Admins manage permissions" ON public.user_module_permissions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own permissions" ON public.user_module_permissions FOR SELECT USING (auth.uid() = user_id);

-- App config: admins write, all read
CREATE POLICY "All read config" ON public.app_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins write config" ON public.app_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));
