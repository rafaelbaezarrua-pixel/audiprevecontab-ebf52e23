-- ============================================
-- Enable ALL modules for batch-registered companies
-- ============================================

UPDATE public.empresas
SET modulos_ativos = ARRAY[
    'licencas',
    'certidoes', 
    'certificados',
    'procuracoes',
    'fiscal',
    'pessoal',
    'vencimentos',
    'recalculos',
    'honorarios'
]
WHERE modulos_ativos IS NULL OR modulos_ativos = '{}';
