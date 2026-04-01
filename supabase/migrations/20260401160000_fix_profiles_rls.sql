-- Fix profiles RLS: ensure admins can read all profiles
-- and non-admin internal users can also read profiles for dropdowns

-- Drop all existing SELECT policies on profiles to avoid conflicts
DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Admins: full CRUD
CREATE POLICY "Admins full access profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can READ profiles (needed for dropdowns, name display, etc)
CREATE POLICY "Authenticated users read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update only their own profile
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
