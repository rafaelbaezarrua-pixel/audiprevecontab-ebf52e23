-- Mark all existing users as having completed their first access
UPDATE public.profiles 
SET first_access_done = true 
WHERE first_access_done IS NULL OR first_access_done = false;
