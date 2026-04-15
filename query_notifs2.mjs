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
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

(async () => {
    // using fetch to post graphql or standard rest for information_schema?
    // Let's just fetch all notifications to see recipient user_id.
    const res = await fetch(`${supabaseUrl}/rest/v1/notification_recipients?select=*,notifications(*)&order=created_at.desc&limit=5`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
})();
