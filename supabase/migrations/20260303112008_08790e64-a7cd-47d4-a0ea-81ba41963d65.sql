
-- Fix permissive INSERT policy on profiles
DROP POLICY "System inserts profile" ON public.profiles;
CREATE POLICY "System inserts profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
