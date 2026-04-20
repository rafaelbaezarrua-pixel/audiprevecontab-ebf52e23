import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function addColumn() {
  console.log("Adding quem_transmitiu column to declaracoes_anuais...");
  const { data, error } = await supabaseAdmin.rpc("exec_sql", {
    sql_query: "ALTER TABLE public.declaracoes_anuais ADD COLUMN IF NOT EXISTS quem_transmitiu TEXT;"
  });

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
        console.log("RPC exec_sql not found. You may need to add the column manually in Supabase SQL Editor: ALTER TABLE public.declaracoes_anuais ADD COLUMN IF NOT EXISTS quem_transmitiu TEXT;");
    } else {
        console.error("Error:", error);
    }
  } else {
    console.log("Column added successfully via RPC.");
  }
}

addColumn();
