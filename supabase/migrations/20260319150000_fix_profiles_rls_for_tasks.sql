-- Allow all authenticated users to see basic profile info (needed for task assignment)
DROP POLICY IF EXISTS "Authenticated users can read basic profile info" ON public.profiles;
CREATE POLICY "Authenticated users can read basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
