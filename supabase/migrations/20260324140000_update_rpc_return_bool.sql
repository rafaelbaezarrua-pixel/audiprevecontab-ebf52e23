-- Migration: Update emit_system_alert to return boolean
-- Description: Changes return type to know if a new notification was actually inserted for the user.
-- This prevents the frontend from showing redundant toasts on every page refresh.

DROP FUNCTION IF EXISTS emit_system_alert(UUID, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION emit_system_alert(
    p_notification_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT,
    p_signature TEXT,
    p_user_id UUID
) RETURNS BOOLEAN -- Changed from void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_notification BOOLEAN := FALSE;
    v_new_recipient BOOLEAN := FALSE;
BEGIN
    -- 1. Try to insert the notification. If it exists (based on signature), do nothing.
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
        v_new_notification := TRUE;
    ELSE
        -- If it already exists, grab its actual ID
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
        v_new_recipient := TRUE;
    END IF;

    -- Return true only if we actually created a new connection for this user
    -- This means it's "new" for them.
    RETURN v_new_recipient;
END;
$$;
