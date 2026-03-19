-- Performance Improvements Migration

-- 1. Indexes for competence-based lookups (common in Fiscal, Pessoal, Honorarios)
CREATE INDEX IF NOT EXISTS idx_fiscal_competencia ON public.fiscal (competencia);
CREATE INDEX IF NOT EXISTS idx_pessoal_competencia ON public.pessoal (competencia);
CREATE INDEX IF NOT EXISTS idx_honorarios_mensal_competencia ON public.honorarios_mensal (competencia);
CREATE INDEX IF NOT EXISTS idx_recalculos_competencia ON public.recalculos (competencia);

-- 2. Indexes for company filtering (Societario)
CREATE INDEX IF NOT EXISTS idx_empresas_situacao ON public.empresas (situacao);
CREATE INDEX IF NOT EXISTS idx_empresas_regime_tributario ON public.empresas (regime_tributario);

-- 3. Composite indexes for faster dashboard scans
CREATE INDEX IF NOT EXISTS idx_fiscal_comp_empresa ON public.fiscal (competencia, empresa_id);
CREATE INDEX IF NOT EXISTS idx_pessoal_comp_empresa ON public.pessoal (competencia, empresa_id);

-- 4. Text index for global search (Partial search optimization)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_empresas_nome_empresa_trigram ON public.empresas USING gin (nome_empresa gin_trgm_ops);
-- Note: Requires pg_trgm extension. If not available, use B-Tree:
-- CREATE INDEX IF NOT EXISTS idx_empresas_nome_empresa ON public.empresas (nome_empresa);
