import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis de ambiente do Supabase ausentes.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");

    // Get the caller user securely
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized Token");

    // Check if the caller is an admin
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) throw new Error("Apenas administradores podem gerenciar usuários.");

    // Parse payload
    const body = await req.json();
    const { action, target_user_id, module, enable } = body;

    if (!action || !target_user_id) throw new Error("Action e target_user_id são obrigatórios.");

    if (action === "toggleModule") {
      if (!module) throw new Error("Module é obrigatório.");
      if (enable) {
        await supabaseAdmin.from("user_module_permissions").insert({ user_id: target_user_id, module_name: module });
      } else {
        await supabaseAdmin.from("user_module_permissions").delete().eq("user_id", target_user_id).eq("module_name", module);
      }
    }
    else if (action === "toggleAdmin") {
      if (enable) {
        await supabaseAdmin.from("user_roles").insert({ user_id: target_user_id, role: "admin" });
      } else {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id).eq("role", "admin");
      }
    }
    else if (action === "deleteUser") {
      // First, we delete the profile. Cascades should handle the rest in public schema.
      const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("user_id", target_user_id);
      if (profileError) {
        console.error("Error deleting profile:", profileError);
        throw new Error(`Erro ao excluir perfil: ${profileError.message}`);
      }

      // Then delete the auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
      if (deleteError) {
        console.error("Error deleting auth user:", deleteError);
        throw deleteError;
      }
    }
    else {
      throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("manage-user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
