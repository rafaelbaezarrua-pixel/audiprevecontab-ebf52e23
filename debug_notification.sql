
-- Test script to debug scheduling notification
DO $$
DECLARE
    v_test_user_id UUID;
    v_agg_id UUID;
    v_notif_count INTEGER;
BEGIN
    SELECT id INTO v_test_user_id FROM auth.users LIMIT 1;
    
    IF v_test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing for user: %', v_test_user_id;
        
        -- Insert a dummy scheduling
        INSERT INTO public.agendamentos (data, horario, usuario_id, assunto, criado_por)
        VALUES (CURRENT_DATE, '10:00', v_test_user_id, 'TESTE NOTIFICAÇÃO', v_test_user_id)
        RETURNING id INTO v_agg_id;
        
        RAISE NOTICE 'Created agendamento ID: %', v_agg_id;
        
        -- Check if notification was created
        SELECT count(*) INTO v_notif_count 
        FROM public.notification_recipients 
        WHERE user_id = v_test_user_id;
        
        RAISE NOTICE 'Notification recipient count for user: %', v_notif_count;
    ELSE
        RAISE NOTICE 'No users found in auth.users';
    END IF;
END $$;
