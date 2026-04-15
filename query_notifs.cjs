const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({path:'.env.local'});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
    // Wait, the client doesn't have an 'execute_sql' RPC usually unless defined.
    // Instead, if the trigger is called `notify_nova_tarefa`, let's see if we can just fix the logic in the DB.
    // But since I don't know the logic...
    // wait, where are notifications inserted?
    const { data, error } = await supabase.from('notifications').select('*').limit(5).order('created_at', { ascending: false });
    console.log("NOTIFICATIONS:");
    console.log(data);
})();
