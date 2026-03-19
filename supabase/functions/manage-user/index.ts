// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// @ts-ignore
import { decode } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

// @ts-ignore: Deno
Deno.serve(async (req: Request) => {
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
      return new Response(JSON.stringify({ error: "Cabeçalho de autorização ausente", status: 'error' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // @ts-ignore: Deno
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore: Deno
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis de ambiente do Supabase ausentes.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "").trim();

    // Decode JWT to get user_id (sub) without hitting Auth database for session
    // Since we trust the Gateway (or we can verify secret), this is more resilient
    let userId: string;
    try {
      const [_header, payload, _signature] = decode(token);
      userId = (payload as any).sub;
      if (!userId) throw new Error("ID do usuário não encontrado no token");
    } catch (err) {
      console.error("Erro ao decodificar token:", err);
      return new Response(JSON.stringify({ error: "Token inválido ou malformado", status: 'error' }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if the caller is an admin in the database
    const { data: roles, error: rolesError } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
    
    if (rolesError) {
      console.error("Erro ao buscar roles:", rolesError);
      return new Response(JSON.stringify({ error: "Falha ao verificar permissões do usuário.", status: 'error' }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const isAdmin = roles?.some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários.", status: 'error' }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse payload
    const body = await req.json();
    const { action, target_user_id, module, enable } = body;

    if (!action || !target_user_id) throw new Error("Action e target_user_id são obrigatórios.");

    if (action === "toggleModule") {
      if (!module) throw new Error("Module é obrigatório.");
      if (enable) {
        const { error: insErr } = await supabaseAdmin.from("user_module_permissions").insert({ user_id: target_user_id, module_name: module });
        if (insErr) throw insErr;
      } else {
        const { error: delErr } = await supabaseAdmin.from("user_module_permissions").delete().eq("user_id", target_user_id).eq("module_name", module);
        if (delErr) throw delErr;
      }
    }
    else if (action === "toggleAdmin") {
      if (enable) {
        const { error: insErr } = await supabaseAdmin.from("user_roles").insert({ user_id: target_user_id, role: "admin" });
        if (insErr) throw insErr;
      } else {
        const { error: delErr } = await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id).eq("role", "admin");
        if (delErr) throw delErr;
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
    return new Response(JSON.stringify({ error: err.message, status: 'error' }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
