
-- Add profile_completed and terms_accepted_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone DEFAULT NULL;

-- Add delete policy for admins on profiles (needed for user management)
CREATE POLICY "Admins delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
