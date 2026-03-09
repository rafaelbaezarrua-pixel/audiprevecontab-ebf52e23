-- ============================================
-- 5. SCHEDULED CRON JOB
-- ============================================

-- Enable pg_cron if not already enabled (might require Superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the expiration check to run daily at midnight
-- Note: 'pg_cron' runs in the 'postgres' database but handles jobs in other databases if configured.
-- We use 'cron.schedule' to run the function in the public schema of the current database.
SELECT cron.schedule('check-expirations-daily', '0 0 * * *', 'SELECT public.check_expirations()');
