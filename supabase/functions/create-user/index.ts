// @ts-expect-error
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// @ts-expect-error
import { decode } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const allowedModules = ["societario", "fiscal", "pessoal", "certidoes", "certificados", "licencas", "procuracoes", "honorarios", "obrigacoes", "parcelamentos", "recalculos", "vencimentos"];

// @ts-expect-error: Deno
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

    // @ts-expect-error: Deno
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-expect-error: Deno
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        error: "Configuração do servidor incompleta",
        code: "env_vars_missing"
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "").trim();

    // Decode JWT for caller ID (more resilient than getUser)
    let callerId: string;
    try {
      const [_header, payload, _signature] = decode(token);
      callerId = (payload as any).sub;
      if (!callerId) throw new Error("ID do chamador não encontrado");
    } catch (err) {
      console.error("Erro ao decodificar token:", err);
      return new Response(JSON.stringify({ error: "Token inválido ou malformado", code: "auth_token_invalid" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // MANDATORY: Check if the caller is an admin
    const { data: roles, error: rolesError } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", callerId);
    if (rolesError) throw rolesError;
    const isAdminCaller = roles?.some((r: any) => r.role === 'admin');
    if (!isAdminCaller) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
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

    // --- ENVIO DE E-MAIL VIA RESEND ---
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (RESEND_API_KEY) {
      console.log(`Gerando link de recuperação para ${email}...`);
      
      const resetRedirectUrl = origin ? `${origin}/reset-password` : undefined;
      
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: resetRedirectUrl }
      });

      if (linkError) {
        console.error("Erro ao gerar link de recuperação:", linkError);
      } else if (linkData?.properties?.action_link) {
        const actionLink = linkData.properties.action_link;
        console.log("Enviando e-mail de boas-vindas via Resend...");
        
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "X-Entity-Ref-ID": crypto.randomUUID(),
            },
            body: JSON.stringify({
              from: "Audipreve Contabilidade <gestor@audiprevecontabilidade.com.br>",
              to: [email],
              subject: "Ativação de Cadastro - Sistema Audipreve",
              html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 12px; color: #333;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://jnqwvysjpbcpbwhlwgqq.supabase.co/storage/v1/object/public/documentos/logo-audipreve.png" alt="Audipreve" style="width: 140px;" />
                  </div>
                  <h2 style="color: #0284c7; text-align: center; margin-bottom: 20px;">Olá, ${nome}!</h2>
                  <p style="font-size: 16px; line-height: 1.6;">Seja bem-vindo ao <strong>Sistema Audipreve</strong>. Seu cadastro foi concluído com sucesso por um administrador.</p>
                  <p style="font-size: 16px; line-height: 1.6;">Para ativar seu acesso e definir sua senha de segurança, clique no botão abaixo:</p>
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${actionLink}" style="background-color: #0284c7; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                      Ativar Meu Acesso
                    </a>
                  </div>
                  <p style="font-size: 13px; color: #666; background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #0284c7;">
                    <strong>Dica de Segurança:</strong> Este link é exclusivo para o seu e-mail e expira em breve. Não o compartilhe com ninguém.
                  </p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                  <p style="font-size: 11px; color: #999; text-align: center; line-height: 1.5;">
                    <strong>Audipreve Contabilidade</strong><br />
                    Este é um e-mail transacional automático referente ao seu cadastro no sistema.<br />
                    Se você não esperava por este e-mail, por favor, ignore-o.
                  </p>
                </div>
              `,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            console.error("Erro no Resend ao enviar boas-vindas:", errorData);
          } else {
            console.log("E-mail de boas-vindas enviado com sucesso!");
          }
        } catch (mailErr) {
          console.error("Exceção ao enviar e-mail via Resend:", mailErr);
        }
      }
    } else {
      console.warn("RESEND_API_KEY não configurada. E-mail de boas-vindas NÃO enviado.");
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
