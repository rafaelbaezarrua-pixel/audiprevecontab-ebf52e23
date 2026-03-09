-- Update the check_cpf_email_match function to securely find a user matching BOTH CPF and email.
-- This prevents issues where duplicate test accounts share the same CPF and ruin the LIMIT 1 check.

CREATE OR REPLACE FUNCTION public.check_cpf_email_match(p_cpf text, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Procure pelo usuário que tenha EXATAMENTE aquele CPF (nas profiles) e E-MAIL (no auth.users)
  SELECT u.id INTO v_user_id
  FROM auth.users u
  JOIN public.profiles p ON u.id = p.user_id
  WHERE p.cpf = p_cpf
    AND lower(trim(u.email)) = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
