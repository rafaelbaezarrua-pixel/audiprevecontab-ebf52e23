/**
 * Script administrativo seguro para consultas ao Supabase
 *
 * Uso: bun run scripts/admin-query.ts
 *
 * SEGURANÇA:
 * - Usa dotenv para carregamento seguro de variáveis de ambiente
 * - Não faz parsing manual de arquivos .env
 * - Usa apenas o anon key (public key) do Supabase
 * - Respeita as políticas de RLS configuradas no banco
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente de forma segura
dotenv.config({ path: '.env.local' });

// Validação de variáveis obrigatórias
const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;
const missingVars = requiredEnvVars.filter(
  varName => !process.env[varName]
);

if (missingVars.length > 0) {
  console.error(`[ERRO] Variáveis de ambiente ausentes: ${missingVars.join(', ')}`);
  console.error('[INFO] Certifique-se que o arquivo .env.local está configurado corretamente');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

// Validação básica do formato da URL
if (!SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.startsWith('http://')) {
  console.error('[ERRO] VITE_SUPABASE_URL deve ser uma URL válida (http:// ou https://)');
  process.exit(1);
}

// Cria cliente Supabase usando a biblioteca oficial
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('[INFO] Conectando ao Supabase...');
  console.log(`[INFO] URL: ${SUPABASE_URL.replace(/\/\/.*\./, '//***.')}`);

  try {
    // Teste de conexão
    const { data: test, error: testError } = await supabase
      .from('notification_recipients')
      .select('id')
      .limit(1);

    if (testError) {
      throw testError;
    }

    console.log('[OK] Conexão estabelecida com sucesso!');
    console.log('');

    // Exemplo: Consultar últimas notificações
    console.log('[INFO] Consultando últimas notificações...');
    const { data: notifications, error } = await supabase
      .from('notification_recipients')
      .select(`
        id,
        user_id,
        is_read,
        created_at,
        notifications (
          id,
          title,
          message,
          type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('[ERRO] Falha na consulta:', error.message);
      return;
    }

    console.log(`[INFO] Encontradas ${notifications?.length || 0} notificações:`);
    console.log(JSON.stringify(notifications, null, 2));

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[ERRO]', errorMessage);
    process.exit(1);
  }
}

main();
