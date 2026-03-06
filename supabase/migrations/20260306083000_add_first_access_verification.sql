-- Add fields to profiles table for first-access verification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_access_done BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP WITH TIME ZONE;

-- Ensure CPF column exists (it should, based on PerfilPage.tsx)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
