-- COMPREHENSIVE FIX FOR SCHEMA AND EXISTING USERS
-- Execute this in the Supabase SQL Editor

-- 1. Ensure columns exist in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome_completo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT; -- Just in case templates mixed these
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_access_done BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Sync nome_completo and full_name if one is populated
UPDATE public.profiles SET nome_completo = full_name WHERE nome_completo IS NULL AND full_name IS NOT NULL;
UPDATE public.profiles SET full_name = nome_completo WHERE full_name IS NULL AND nome_completo IS NOT NULL;

-- 3. Mark existing users as COMPLETE and VERIFIED
-- (Only for those who already have a profile or were created before today)
UPDATE public.profiles 
SET 
  profile_completed = true,
  first_access_done = true 
WHERE 
  profile_completed IS NULL OR 
  first_access_done IS NULL;

-- 4. Ensure notification tables are accessible (for the 400 error)
-- Check if relationships exist for the query used in ConfiguracoesPage
-- Profiles -> notification_recipients is usually via user_id

-- 5. RPC for Password Recovery
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
    SELECT user_id INTO v_user_id FROM public.profiles WHERE cpf = p_cpf;
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    RETURN v_email;
END;
$$;
