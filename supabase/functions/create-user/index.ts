import { createClient } from "supabase";

const allowedModules = ["societario", "fiscal", "pessoal", "certidoes", "certificados", "licencas", "procuracoes", "honorarios", "obrigacoes", "parcelamentos", "recalculos", "vencimentos"];

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
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar se quem chama é admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), { status: 401, headers: corsHeaders });
    }

    const { data: callerRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = callerRoles?.some((r: any) => r.role === "admin");

    // Permitir se for o primeiro usuário (admin inicial) ou se o chamador for admin
    if (!isAdmin && callerRoles && callerRoles.length > 0) {
      return new Response(JSON.stringify({ error: "Acesso negado: Apenas administradores podem criar usuários" }), { status: 403, headers: corsHeaders });
    }

    const { email, password, nome, isAdmin: makeAdmin, modules } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email e senha são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // Criar usuário no Auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nome, nome_completo: nome },
    });

    if (createError) throw createError;
    const userId = userData.user.id;

    // Garantir Perfil
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      full_name: nome,
      nome_completo: nome,
      profile_completed: true,
      terms_accepted_at: new Date().toISOString()
    });

    // Papel de Admin
    if (makeAdmin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    }

    // Permissões de Módulo
    if (modules && typeof modules === "object") {
      const inserts = Object.entries(modules)
        .filter(([k, v]) => v && allowedModules.includes(k))
        .map(([k]) => ({ user_id: userId, module_name: k }));

      if (inserts.length > 0) {
        await supabaseAdmin.from("user_module_permissions").insert(inserts);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro na função:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }
});
