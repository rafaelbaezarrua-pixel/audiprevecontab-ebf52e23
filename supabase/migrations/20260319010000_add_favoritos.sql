-- Add favoritos column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS favoritos text[] DEFAULT '{}';

-- Create an index to quickly lookup users by their favorite modules (if needed in the future)
CREATE INDEX IF NOT EXISTS idx_profiles_favoritos ON public.profiles USING gin (favoritos);
