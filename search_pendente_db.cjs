const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {
    VITE_SUPABASE_URL: "https://jnqwvysjpbcpbwhlwgqq.supabase.co",
    VITE_SUPABASE_ANON_KEY: "sb_publishable_BJf-1X4iJTcX0GSu4eHfBQ_HI9lUbuT"
};

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('Searching for "pendente" in database routines...');
    // We try to use a RPC if it exists, but usually we can't query information_schema easily via anon key if RLS is tight.
    // However, sometimes there's a custom RPC like 'execute_sql'.
    const { data: routines, error } = await supabase.rpc('execute_sql', { 
        sql: "SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_definition ILIKE '%pendente%' AND routine_definition ILIKE '%tarefa%'" 
    });
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Found ${routines.length} routines.`);
    routines.forEach(r => {
        console.log(`\n--- Routine: ${r.routine_name} ---`);
        console.log(r.routine_definition);
    });
}

run();
