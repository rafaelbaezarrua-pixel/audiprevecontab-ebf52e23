const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        env[key] = value;
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: triggers, error } = await supabase.rpc('execute_sql', { 
        sql: "SELECT tgname, tgfoid::regproc as function_name FROM pg_trigger JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid WHERE relname = 'tarefas'" 
    });
    
    if (error) {
        console.error('Error fetching triggers:', error);
        return;
    }
    
    console.log('Triggers for table tarefas:');
    console.table(triggers);

    for (const tg of triggers || []) {
        const { data: funcDef, error: funcError } = await supabase.rpc('execute_sql', {
            sql: `SELECT routine_definition FROM information_schema.routines WHERE routine_name = '${tg.function_name.split('(')[0].split('.')[1] || tg.function_name.split('(')[0]}'`
        });
        if (!funcError && funcDef && funcDef.length > 0) {
            console.log(`\n--- Definition of ${tg.function_name} ---`);
            console.log(funcDef[0].routine_definition);
        }
    }
}

run();
