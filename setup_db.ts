import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addEmailAlertasColumn() {
  const { data, error } = await supabaseAdmin.rpc("exec_sql", {
    sql_query: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_alertas TEXT;"
  });

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
       console.log("No RPC exists. Trying generic insertion.");
    } else {
       console.error("Error:", error);
    }
  } else {
    console.log("Column added successfully via RPC.");
  }
}

addEmailAlertasColumn();
