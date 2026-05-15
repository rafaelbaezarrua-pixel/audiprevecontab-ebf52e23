/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-expect-error: Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const ALLOWED_ORIGINS = [
  "https://audiprevecontabilidade.com.br",
  "https://www.audiprevecontabilidade.com.br",
  "https://portal.contab.audiprevecontabilidade.com.br",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

// @ts-expect-error: Deno env
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    console.log("Authorization Header present:", !!authHeader);

    if (!authHeader) {
      console.error("Erro: Cabeçalho de autorização ausente");
      return new Response(JSON.stringify({ error: "Cabeçalho de autorização ausente" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // @ts-expect-error: Deno env
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-expect-error: Deno env
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Erro: Variáveis de ambiente não configuradas");
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "").trim();

    // Verify JWT via Supabase Auth (validates signature + expiration)
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authUser) {
      console.error("Token verification failed details:", {
        error: authError?.message,
        status: authError?.status,
        tokenPrefix: token.substring(0, 10)
      });
      return new Response(JSON.stringify({ 
        error: "Token inválido ou expirado", 
        details: authError?.message 
      }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const userId = authUser.id;

    // Check if the caller is an admin in the database
    console.log("Checking admin permissions for user:", userId);
    const { data: roles, error: rolesError } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
    
    if (rolesError) {
      console.error("Erro ao buscar roles:", rolesError);
      return new Response(JSON.stringify({ error: "Falha ao verificar permissões do usuário." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const isAdmin = roles?.some((r: { role: string }) => r.role === 'admin' || r.role === 'SUPER_ADMIN');
    if (!isAdmin) {
      console.warn("Usuário não tem permissão de admin:", userId);
      return new Response(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse payload
    const body = await req.json();
    const { action, target_user_id, module, enable } = body;
    console.log("Manage User Action:", action, "Target:", target_user_id);

    if (!action || !target_user_id) throw new Error("Action e target_user_id são obrigatórios.");

    if (action === "toggleModule") {
      if (!module) throw new Error("Module é obrigatório.");
      if (enable) {
        const { error: upsertErr } = await supabaseAdmin.from("user_module_permissions").upsert(
          { user_id: target_user_id, module_name: module },
          { onConflict: 'user_id,module_name' }
        );
        if (upsertErr) throw upsertErr;
      } else {
        const { error: delErr } = await supabaseAdmin.from("user_module_permissions").delete().eq("user_id", target_user_id).eq("module_name", module);
        if (delErr) throw delErr;
      }
    }
    else if (action === "toggleAdmin") {
      if (enable) {
        const { error: insErr = null } = await supabaseAdmin.from("user_roles").insert({ user_id: target_user_id, role: "admin" });
        if (insErr) throw insErr;
      } else {
        const { error: delErr = null } = await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id).eq("role", "admin");
        if (delErr) throw delErr;
      }
    }
    else if (action === "toggleUserType") {
      const { role } = body;
      if (!role) throw new Error("Role is required.");

      // Limpa cargos conflitantes ('user', 'client') antes de inserir o novo 
      // para evitar que o usuário acumule perfis de Equipe Interna e Portal simultaneamente.
      await supabaseAdmin.from("user_roles").delete()
        .eq("user_id", target_user_id)
        .in("role", ["user", "client"]);

      const { error: insErr } = await supabaseAdmin.from("user_roles").insert({ 
        user_id: target_user_id, 
        role: role 
      });
      
      if (insErr) throw insErr;
    }
    else if (action === "deleteUser") {
      console.log("Iniciando exclusão total do usuário:", target_user_id);
      
      // 1. Limpar permissões de módulos
      await supabaseAdmin.from("user_module_permissions").delete().eq("user_id", target_user_id);
      
      // 2. Limpar cargos (roles)
      await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id);
      
      // 3. Limpar consentimentos LGPD
      await supabaseAdmin.from("user_consents").delete().eq("user_id", target_user_id);

      // 4. Limpar vínculos com empresas (Portal Cliente)
      await supabaseAdmin.from("empresa_acessos").delete().eq("user_id", target_user_id);

      // 5. Deletar o perfil
      const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("user_id", target_user_id);
      if (profileError) {
        console.error("Erro ao deletar perfil:", profileError);
        throw new Error(`Erro ao excluir perfil: ${profileError.message}`);
      }

      // 6. Deletar o usuário do Auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
      if (deleteError) {
        console.error("Erro ao deletar usuário no Auth:", deleteError);
        throw deleteError;
      }
      console.log("Usuário e todas as suas dependências deletados com sucesso.");
    }
    else {
      throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("manage-user error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
