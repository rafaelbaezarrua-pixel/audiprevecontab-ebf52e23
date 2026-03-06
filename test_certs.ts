import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jnqwvysjpbcpbwhlwgqq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-key-here'; // I'll extract it from .env

import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.from('certificados_digitais').select('*');
    console.log('DATA:', data);
    console.log('ERROR:', error);
}

test();
