import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    if (line.includes('=')) {
        const [k, ...v] = line.split('=');
        env[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
    }
});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
(async () => {
    const { data: recs, error: e1 } = await supabase.from('notifications').select('*, notification_recipients(*)').order('created_at', { ascending: false }).limit(2);
    console.log(JSON.stringify(recs, null, 2));
    if (e1) console.error("Err e1", e1);
})();
