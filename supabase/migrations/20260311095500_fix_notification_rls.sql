-- Migration to fix RLS policies for notifications and recipients
-- Date: 2026-03-11

-- 1. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- 2. Notifications Policies
DROP POLICY IF EXISTS "Anyone can read system notifications" ON public.notifications;
CREATE POLICY "Anyone can read system notifications" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Notification Recipients Policies
DROP POLICY IF EXISTS "Users can manage their own notification links" ON public.notification_recipients;
CREATE POLICY "Users can manage their own notification links" 
ON public.notification_recipients FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: Add a simple policy for notification_types if it doesn't have one
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read notification types" ON public.notification_types;
CREATE POLICY "Anyone can read notification types" 
ON public.notification_types FOR SELECT 
TO authenticated 
USING (true);
-- 4. Ensure notification types exist
INSERT INTO public.notification_types (id, label, description, is_enabled)
VALUES ('alerta_sistema', 'Alertas do Sistema', 'Alertas automáticos gerados pelo sistema para certificados, agendamentos e outros.', true)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- 5. Add unique index on signature to prevent duplicates and allow UPSERT
-- Removed WHERE clause because Supabase JS client doesn't support partial indexes in onConflict
DROP INDEX IF EXISTS idx_notifications_signature;
CREATE UNIQUE INDEX idx_notifications_signature 
ON public.notifications ((metadata->>'signature'));
-- 6. Fix Supabase Linter: Enable RLS on user_module_permissions
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;
