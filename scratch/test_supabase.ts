
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', SUPABASE_URL);
console.log('Key (prefix):', SUPABASE_KEY?.substring(0, 20) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('clients').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Data fetched.');
  }
}

test();
