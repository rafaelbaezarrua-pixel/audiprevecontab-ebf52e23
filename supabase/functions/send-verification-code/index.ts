import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("send-verification-code: [PASSO 1] Início");
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

        if (!RESEND_API_KEY || !supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
            console.error("send-verification-code: [ERRO 500] Env vars faltando");
            return new Response(JSON.stringify({
                error: "Configuração do servidor incompleta (Env vars missing)",
                resend_present: !!RESEND_API_KEY,
                url_present: !!supabaseUrl,
                service_present: !!supabaseServiceKey,
                anon_present: !!supabaseAnonKey
            }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            console.warn("send-verification-code: [ERRO 401] Sem header Auth");
            return new Response(JSON.stringify({ error: "Não autenticado (Header Authorization ausente)" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        console.log("send-verification-code: [PASSO 2] Validando usuário...");
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
            console.error("send-verification-code: [ERRO 401] Auth check failed:", authError?.message);
            return new Response(JSON.stringify({ error: "Token inválido ou sessão expirada", details: authError?.message }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        console.log("send-verification-code: [PASSO 3] Usuário validado:", user.id, user.email);

        const body = await req.json();
        const { action } = body;
        console.log("send-verification-code: [PASSO 4] Ação recebida:", action);

        if (action === "send") {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

            console.log("send-verification-code: [PASSO 5] Salvando código no DB...");
            const { error: dbError } = await supabaseAdmin.from("profiles").update({
                verification_code: code,
                verification_code_expires_at: expiresAt
            }).eq("user_id", user.id);

            if (dbError) {
                console.error("send-verification-code: [ERRO DB]", dbError.message);
                throw new Error("Erro ao salvar código de verificação: " + dbError.message);
            }

            // Enviar email via Resend
            console.log("send-verification-code: [PASSO 6] Enviando e-mail via Resend...");
            if (!user.email) throw new Error("E-mail do usuário não encontrado na sessão.");

            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: "Audipreve <societario@audiprevecontabilidade.com.br>",
                    to: [user.email],
                    subject: `${code} é seu código de verificação Audipreve`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #333 text-align: center;">Verificação de Segurança</h2>
                            <p>Olá,</p>
                            <p>Você está realizando seu primeiro acesso ou recuperando sua senha no sistema Audipreve. Use o código abaixo para verificar sua identidade:</p>
                            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; border-radius: 8px; margin: 20px 0;">
                                ${code}
                            </div>
                            <p style="font-size: 14px; color: #666;">Este código expira em 10 minutos. Se você não solicitou este acesso, ignore este e-mail.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center;">Audipreve Contabilidade</p>
                        </div>
                    `,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("send-verification-code: [ERRO Resend]", errorData);

                // Se for erro de destinatário não verificado (Resend Free Tier)
                if (res.status === 403 && errorData.message?.includes("You can only send testing emails to your own email address")) {
                    console.warn(`send-verification-code: [BYPASS] Resend bloqueou envio para ${user.email}. CÓDIGO GERADO: ${code}`);
                    return new Response(JSON.stringify({
                        success: true,
                        message: "Código gerado (Bypass: Email não enviado devido a restrição comercial)",
                        dev_note: "O domínio não está validado no Resend. O código foi logado no console do Supabase para teste.",
                        bypass: true
                    }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                throw new Error("Falha ao enviar e-mail: " + (errorData.message || JSON.stringify(errorData)));
            }

            console.log("send-verification-code: [PASSO 7] Sucesso!");
            return new Response(JSON.stringify({ success: true, message: "Código enviado" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "verify") {
            const { code } = body;
            console.log("send-verification-code: [PASSO 5v] Verificando código...");
            const { data: profile, error: selectError } = await supabaseAdmin.from("profiles")
                .select("verification_code, verification_code_expires_at")
                .eq("user_id", user.id)
                .single();

            if (selectError) throw new Error("Erro ao buscar perfil: " + selectError.message);

            if (!profile || profile.verification_code !== code) {
                console.warn("send-verification-code: [ERRO 400] Código incorreto");
                return new Response(JSON.stringify({ error: "Código inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            if (new Date() > new Date(profile.verification_code_expires_at)) {
                console.warn("send-verification-code: [ERRO 400] Código expirado");
                return new Response(JSON.stringify({ error: "Código expirado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            console.log("send-verification-code: [PASSO 6v] Marcando como verificado...");
            const { error: updateError } = await supabaseAdmin.from("profiles").update({
                first_access_done: true,
                verification_code: null,
                verification_code_expires_at: null
            }).eq("user_id", user.id);

            if (updateError) throw updateError;

            console.log("send-verification-code: [PASSO 7v] Verificado com sucesso!");
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err: any) {
        console.error("send-verification-code: [ERRO FATAL]", err.message);
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
