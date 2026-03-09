-- VERIFICATION SCRIPT FOR NOTIFICATION SYSTEM

BEGIN;

-- 1. Test Company Registration Notification
INSERT INTO public.empresas (nome_empresa, cnpj, situacao)
VALUES ('EMPRESA TESTE NOTIFICAÇÃO', '00.000.000/0001-00', 'ativa')
RETURNING id;

-- 2. Test Company Status Change Notification
UPDATE public.empresas 
SET situacao = 'paralisada'
WHERE nome_empresa = 'EMPRESA TESTE NOTIFICAÇÃO';

-- 3. Test Expirations
-- Insert a license expiring today
INSERT INTO public.licencas (empresa_id, tipo_licenca, status, vencimento)
SELECT id, 'Alvará Teste', 'com_vencimento', CURRENT_DATE
FROM public.empresas WHERE nome_empresa = 'EMPRESA TESTE NOTIFICAÇÃO';

-- Insert a license expiring in 30 days
INSERT INTO public.licencas (empresa_id, tipo_licenca, status, vencimento)
SELECT id, 'Bombeiros Teste', 'com_vencimento', CURRENT_DATE + INTERVAL '30 days'
FROM public.empresas WHERE nome_empresa = 'EMPRESA TESTE NOTIFICAÇÃO';

-- Manually trigger the expiration check
SELECT public.check_expirations();

-- 4. Verify Results
SELECT 'NOTIFICATIONS CREATED:' as info;
SELECT title, message, type, created_at 
FROM public.notifications 
WHERE message LIKE '%EMPRESA TESTE NOTIFICAÇÃO%'
OR message LIKE '%Alvará Teste%'
OR message LIKE '%Bombeiros Teste%';

SELECT 'RECIPIENTS COUNT:' as info;
SELECT n.title, COUNT(r.id) as recipient_count
FROM public.notifications n
LEFT JOIN public.notification_recipients r ON r.notification_id = n.id
WHERE n.message LIKE '%EMPRESA TESTE NOTIFICAÇÃO%'
GROUP BY n.title;

-- ROLLBACK to not pollute the database
ROLLBACK;
