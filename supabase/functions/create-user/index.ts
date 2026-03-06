import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
      return new Response(JSON.stringify({
        error: "Não autenticado (Header Authorization ausente)",
        code: "no_auth_header"
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        error: "Configuração do servidor incompleta",
        code: "env_vars_missing"
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      return new Response(JSON.stringify({
        error: "Sessão inválida ou expirada",
        details: authError?.message,
        code: "auth_token_invalid"
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ler corpo da requisição
    let body;
    try {
      body = await req.json();
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, nome, isAdmin: makeAdmin, modules } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verificar permissão
    const { data: callerRoles, error: rolesError } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = callerRoles?.some((r: any) => r.role === "admin");

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado: Apenas administradores podem criar usuários" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verificar se o usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userAlreadyExists = existingUsers?.users.some((u: any) => u.email === email);

    if (userAlreadyExists) {
      return new Response(JSON.stringify({
        error: "Este e-mail já está cadastrado no sistema.",
        code: "user_already_exists"
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Gerar link de convite e enviar e-mail via SMTP do Supabase
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: nome, nome_completo: nome },
        redirectTo: `${origin}/reset-password`
      }
    );

    if (createError) throw createError;

    const userId = userData.user.id;

    // Atualizar perfil (handling potential trigger conflict)
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      full_name: nome,
      nome_completo: nome,
      profile_completed: false,
      first_access_done: false
    }, { onConflict: 'user_id' });

    if (profileError) throw profileError;

    if (makeAdmin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: 'user_id,role' });
    }

    if (modules && typeof modules === "object") {
      const inserts = Object.entries(modules)
        .filter(([k, v]) => v && allowedModules.includes(k))
        .map(([k]) => ({ user_id: userId, module_name: k }));

      if (inserts.length > 0) {
        await supabaseAdmin.from("user_module_permissions").upsert(inserts, { onConflict: 'user_id,module_name' });
      }
    }

    console.log(`Usuário ${email} criado com sucesso.`);
    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("create-user: Erro FATAL capturado:", err.message);
    return new Response(JSON.stringify({
      error: "Erro interno na função",
      details: err.message,
      stack: err.stack
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
