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
        error: "Não autenticado",
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
        error: "Sessão inválida",
        code: "auth_token_invalid"
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { email, nome, cpf, isAdmin: makeAdmin, modules, role, empresa_id, password } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user already exists
    const { data: userDataObj, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = userDataObj.users.find((u: any) => u.email === email);
    let userId;

    if (existingUser) {
      const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: password || "Mudar@Audipreve123",
        email_confirm: true,
        user_metadata: {
          full_name: nome,
          nome_completo: nome,
          role: role || (makeAdmin ? 'admin' : 'user'),
          empresa_id: empresa_id
        }
      });
      if (updateError) throw updateError;
      userId = updated.user.id;
    } else {
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: password || "Mudar@Audipreve123",
        email_confirm: true,
        user_metadata: {
          full_name: nome,
          nome_completo: nome,
          role: role || (makeAdmin ? 'admin' : 'user'),
          empresa_id: empresa_id
        }
      });
      if (createError) throw createError;
      userId = userData.user.id;
    }

    const isClientRole = role === 'client' || !!empresa_id;

    // Profiles upsert - Only safe columns
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      full_name: nome,
      nome_completo: nome,
      cpf: cpf || null,
      profile_completed: isClientRole,
      first_access_done: isClientRole
    }, { onConflict: 'user_id' });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      // We continue anyway as the user is created
    }

    // Role assignment
    if (makeAdmin || role === 'admin') {
      const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: 'user_id,role' });
      if (roleErr) throw roleErr;
    } else if (role === 'client') {
      const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "client" }, { onConflict: 'user_id,role' });
      if (roleErr) throw roleErr;
    } else {
      // Ensure they have 'user' role at least
      const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "user" }, { onConflict: 'user_id,role' });
      if (roleErr) throw roleErr;
    }

    // Client assignment (empresa_acessos)
    if (role === 'client' || empresa_id) {
      const { error: accessError } = await supabaseAdmin.from("empresa_acessos").upsert({
        user_id: userId,
        empresa_id: empresa_id,
        modulos_permitidos: allowedModules // Default all for now or pass from body
      }, { onConflict: 'user_id,empresa_id' });

      if (accessError) console.error("Access upsert error:", accessError);
    } else if (modules && typeof modules === 'object') {
      // User Module Permissions assignment (for internal users)
      const moduleInserts = Object.entries(modules)
        .filter(([_, isGranted]) => isGranted === true)
        .map(([moduleName, _]) => ({
          user_id: userId,
          module_name: moduleName
        }));

      if (moduleInserts.length > 0) {
        // Clear existing permissions just in case it's an update
        const { error: clrErr } = await supabaseAdmin.from("user_module_permissions").delete().eq("user_id", userId);
        if (clrErr) throw clrErr;

        const { error: modulesError } = await supabaseAdmin.from("user_module_permissions").insert(moduleInserts);
        if (modulesError) {
          console.error("Modules insert error:", modulesError);
          throw modulesError;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("create-user error:", err);
    return new Response(JSON.stringify({
      error: "Erro interno",
      details: err.message
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
