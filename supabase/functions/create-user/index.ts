import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: callerRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = callerRoles?.some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, nome, isAdmin: makeAdmin, modules } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate password strength
    if (typeof password !== "string" || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters with an uppercase letter and a number" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sanitize nome
    const sanitizedNome = typeof nome === "string" ? nome.trim().slice(0, 200) : "";

    // Validate module names against allowed list
    const allowedModules = ["societario", "fiscal", "pessoal", "certidoes", "certificados", "licencas", "procuracoes", "honorarios", "obrigacoes", "parcelamentos", "recalculos", "vencimentos"];
    if (modules && typeof modules === "object") {
      for (const key of Object.keys(modules)) {
        if (!allowedModules.includes(key)) {
          return new Response(JSON.stringify({ error: `Invalid module: ${key}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // Create user with auto-confirm so they can login immediately
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: sanitizedNome },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = userData.user.id;

    // Ensure profile exists (trigger may not fire immediately)
    const { data: existingProfile } = await supabaseAdmin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (existingProfile) {
      await supabaseAdmin.from("profiles").update({ nome_completo: nome || "" }).eq("user_id", userId);
    } else {
      await supabaseAdmin.from("profiles").insert({ user_id: userId, nome_completo: nome || "" });
    }

    // Assign admin role if requested
    if (makeAdmin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    }

    // Assign module permissions
    if (modules && typeof modules === "object") {
      const moduleInserts = Object.entries(modules)
        .filter(([, v]) => v)
        .map(([k]) => ({ user_id: userId, module_name: k }));
      if (moduleInserts.length > 0) {
        await supabaseAdmin.from("user_module_permissions").insert(moduleInserts);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
