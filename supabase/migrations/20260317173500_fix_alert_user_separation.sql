-- Fix separação de usuários (Equipe x Cliente) no sistema de alertas
-- A função get_company_user_emails antes retornava TODOS os usuários associados a empresa
-- Agora, vai filtrar para excluir quem tem o cargo 'client', que são os clientes do portal

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
    WHERE ea.empresa_id = p_empresa_id
    -- Remove os clientes para que eles não recebam emails de "Resumo da Equipe"
    AND NOT EXISTS (
        SELECT 1 FROM public.user_roles r 
        WHERE r.user_id = u.id AND r.role = 'client'
    );
END;
$$ LANGUAGE plpgsql;
