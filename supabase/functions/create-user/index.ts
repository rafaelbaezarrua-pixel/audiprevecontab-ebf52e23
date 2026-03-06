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
    console.log("create-user: Início da execução");
    console.log("create-user: Header Authorization presente:", !!authHeader);

    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Não autenticado (Header Authorization ausente)",
        code: "no_auth_header"
      }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("create-user: SUPABASE_URL presente:", !!supabaseUrl);
    console.log("create-user: SUPABASE_SERVICE_ROLE_KEY presente:", !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        error: "Configuração do servidor incompleta (Env vars missing)",
        url_present: !!supabaseUrl,
        key_present: !!supabaseServiceKey
      }), { status: 500, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");

    console.log("create-user: Validando token do usuário chamador...");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      console.error("create-user: Erro na validação do token:", authError?.message);
      return new Response(JSON.stringify({
        error: "Sessão inválida ou expirada",
        details: authError?.message,
        code: "auth_token_invalid"
      }), { status: 401, headers: corsHeaders });
    }

    console.log("create-user: Chamador validado ID:", caller.id);

    // Ler corpo da requisição
    let body;
    try {
      body = await req.json();
      console.log("create-user: Corpo recebido:", JSON.stringify(body));
    } catch (e: any) {
      console.error("create-user: Erro ao ler JSON do corpo:", e.message);
      return new Response(JSON.stringify({ error: "Corpo da requisição inválido (JSON malformado)" }), { status: 400, headers: corsHeaders });
    }

    const { email, nome, isAdmin: makeAdmin, modules } = body;

    if (!email) {
      console.error("create-user: Email não fornecido");
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), { status: 400, headers: corsHeaders });
    }

    // Verificar permissão
    const { data: callerRoles, error: rolesError } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    if (rolesError) console.error("create-user: Erro ao buscar roles do chamador:", rolesError.message);

    const isAdmin = callerRoles?.some((r: any) => r.role === "admin");
    console.log("create-user: Chamador é admin?", isAdmin);

    if (!isAdmin && callerRoles && callerRoles.length > 0) {
      console.warn("create-user: Acesso negado para não-admin");
      return new Response(JSON.stringify({ error: "Acesso negado: Apenas administradores podem criar usuários" }), { status: 403, headers: corsHeaders });
    }

    // Verificar se o usuário já existe para dar um erro mais claro
    console.log("create-user: Verificando se usuário já existe:", email);
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) console.error("create-user: Erro ao listar usuários:", listError.message);

    const userAlreadyExists = existingUsers?.users.some((u: any) => u.email === email);
    if (userAlreadyExists) {
      console.warn("create-user: Usuário já cadastrado:", email);
      return new Response(JSON.stringify({
        error: "Este e-mail já está cadastrado no sistema.",
        code: "user_already_exists"
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("create-user: Criando usuário direto (bypass SMTP)...", email);
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: { full_name: nome, nome_completo: nome },
      password: "Mudar@Audipreve123" // Senha temporária padrão
    });

    if (createError) {
      console.error("create-user: Erro na criação direta:", createError.message);
      throw createError;
    }

    const userId = userData.user.id;
    console.log("create-user: Usuário criado ID:", userId);

    console.log("create-user: Criando perfil...");
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      full_name: nome,
      nome_completo: nome,
      profile_completed: false,
      first_access_done: false
    });

    if (profileError) {
      console.error("create-user: Erro ao criar perfil:", profileError.message);
      throw profileError;
    }

    if (makeAdmin) {
      console.log("create-user: Atribuindo papel de admin...");
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    }

    if (modules && typeof modules === "object") {
      console.log("create-user: Atribuindo permissões de módulos...");
      const inserts = Object.entries(modules)
        .filter(([k, v]) => v && allowedModules.includes(k))
        .map(([k]) => ({ user_id: userId, module_name: k }));

      if (inserts.length > 0) {
        const { error: modError } = await supabaseAdmin.from("user_module_permissions").insert(inserts);
        if (modError) console.error("create-user: Erro nas permissões de módulo:", modError.message);
      }
    }

    console.log("create-user: Sucesso total!");
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
