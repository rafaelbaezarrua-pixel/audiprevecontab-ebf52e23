-- Function to check if email and CPF match for password recovery
CREATE OR REPLACE FUNCTION public.get_user_email_by_cpf(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
BEGIN
    -- Find user_id from profiles
    SELECT user_id INTO v_user_id FROM public.profiles WHERE cpf = p_cpf;
    
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Find email from auth.users
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    
    RETURN v_email;
END;
$$;
