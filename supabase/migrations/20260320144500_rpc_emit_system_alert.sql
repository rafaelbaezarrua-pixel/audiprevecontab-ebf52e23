-- ==============================================================================
-- Migration: Create RPC for System Alerts
--
-- Description: Creates a SECURITY DEFINER function to allow the system to securely
-- insert system alerts and their respective recipients atomically, bypassing 
-- the finicky RLS policies that block client-side insertions.
-- ==============================================================================

CREATE OR REPLACE FUNCTION emit_system_alert(
    p_notification_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT,
    p_signature TEXT,
    p_user_id UUID
) RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Try to insert the notification. If it exists (based on signature), do nothing.
    -- We assume the 'signature' is stored in the metadata jsonb column.
    -- To avoid duplicate inserts, we check if one already exists.
    IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE type = 'alerta_sistema' 
        AND metadata->>'signature' = p_signature
    ) THEN
        INSERT INTO public.notifications (id, title, message, type, link, metadata)
        VALUES (
            p_notification_id, 
            p_title, 
            p_message, 
            'alerta_sistema', 
            p_link, 
            jsonb_build_object('signature', p_signature)
        );
    ELSE
        -- If it already exists, grab its actual ID instead of failing
        SELECT id INTO p_notification_id 
        FROM public.notifications 
        WHERE type = 'alerta_sistema' 
        AND metadata->>'signature' = p_signature 
        LIMIT 1;
    END IF;

    -- 2. Link the user to the notification
    IF NOT EXISTS (
        SELECT 1 FROM public.notification_recipients 
        WHERE notification_id = p_notification_id 
        AND user_id = p_user_id
    ) THEN
        INSERT INTO public.notification_recipients (notification_id, user_id, is_read)
        VALUES (p_notification_id, p_user_id, false);
    END IF;
END;
$$;
