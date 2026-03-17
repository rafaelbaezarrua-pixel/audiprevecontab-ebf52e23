-- Migration to create a unified function for daily expirations
CREATE OR REPLACE FUNCTION public.get_daily_expirations(p_force_all BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    empresa_id UUID,
    nome_empresa TEXT,
    email_rfb TEXT,
    documento_tipo TEXT,
    vencimento DATE,
    dias_restantes INTEGER,
    link TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH all_expirations AS (
        -- [Union blocks as before...]
        -- Certificados Digitais
        SELECT 
            c.empresa_id, 
            e.nome_empresa, 
            e.email_rfb, 
            'Certificado Digital'::TEXT as documento_tipo, 
            c.data_vencimento as vencimento, 
            '/certificados'::TEXT as link
        FROM public.certificados_digitais c
        JOIN public.empresas e ON e.id = c.empresa_id
        WHERE c.data_vencimento IS NOT NULL
        
        UNION ALL
        
        -- Licenças
        SELECT 
            l.empresa_id, 
            e.nome_empresa, 
            e.email_rfb, 
            'Licença (' || l.tipo_licenca || ')'::TEXT, 
            l.vencimento, 
            '/licencas'::TEXT
        FROM public.licencas l
        JOIN public.empresas e ON e.id = l.empresa_id
        WHERE l.vencimento IS NOT NULL
        
        UNION ALL
        
        -- Taxas
        SELECT 
            t.empresa_id, 
            e.nome_empresa, 
            e.email_rfb, 
            'Taxa (' || t.tipo_licenca || ')'::TEXT, 
            t.data_vencimento, 
            '/taxas'::TEXT
        FROM public.licencas_taxas t
        JOIN public.empresas e ON e.id = t.empresa_id
        WHERE t.data_vencimento IS NOT NULL
        
        UNION ALL
        
        -- Procurações
        SELECT 
            p.empresa_id, 
            e.nome_empresa, 
            e.email_rfb, 
            'Procuração'::TEXT, 
            p.data_vencimento, 
            '/procuracoes'::TEXT
        FROM public.procuracoes p
        JOIN public.empresas e ON e.id = p.empresa_id
        WHERE p.data_vencimento IS NOT NULL
        
        UNION ALL
        
        -- Certidões
        SELECT 
            c.empresa_id, 
            e.nome_empresa, 
            e.email_rfb, 
            'Certidão (' || c.tipo_certidao || ')'::TEXT, 
            c.vencimento, 
            '/certidoes'::TEXT
        FROM public.certidoes c
        JOIN public.empresas e ON e.id = c.empresa_id
        WHERE c.vencimento IS NOT NULL
    )
    SELECT 
        ae.empresa_id, 
        ae.nome_empresa, 
        ae.email_rfb, 
        ae.documento_tipo, 
        ae.vencimento, 
        (ae.vencimento - CURRENT_DATE)::INTEGER as dias_restantes,
        ae.link
    FROM all_expirations ae
    WHERE 
        (p_force_all = TRUE AND (ae.vencimento - CURRENT_DATE) BETWEEN 0 AND 30)
        OR
        (p_force_all = FALSE AND (ae.vencimento - CURRENT_DATE) IN (30, 15, 7, 1, 0));
END;
$$ LANGUAGE plpgsql;

-- Function to get all users (emails) who have access to a specific company
CREATE OR REPLACE FUNCTION public.get_company_user_emails(p_empresa_id UUID)
RETURNS TABLE (email TEXT)
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT u.email::TEXT
    FROM public.empresa_acessos ea
    JOIN auth.users u ON u.id = ea.user_id
    WHERE ea.empresa_id = p_empresa_id;
END;
$$ LANGUAGE plpgsql;
