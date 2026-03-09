-- Create a securely defined function to check if a CPF and Email match without bypassing Row-Level Security for public reads
CREATE OR REPLACE FUNCTION public.check_cpf_email_match(p_cpf text, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- executes with privileges of the creator
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_matching_email text;
BEGIN
  -- 1. Encontrar o user_id pelo CPF na tabela profiles
  SELECT user_id INTO v_user_id
  FROM public.profiles
  WHERE cpf = p_cpf
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Encontrar o email na tabela auth.users (necessita SECURITY DEFINER para ler auth.users de fora)
  SELECT email INTO v_matching_email
  FROM auth.users
  WHERE id = v_user_id;

  -- 3. Comparar ignorando case status
  IF lower(v_matching_email) = lower(p_email) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
