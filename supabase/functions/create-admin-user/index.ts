import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  const { email, password, nome } = await req.json();

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Create user with auto-confirm
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome_completo: nome },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Update profile name
  await supabaseAdmin.from("profiles").update({ nome_completo: nome }).eq("user_id", userData.user.id);

  // Assign admin role
  const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: userData.user.id, role: "admin" });

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ success: true, user_id: userData.user.id }), { headers: { "Content-Type": "application/json" } });
});
