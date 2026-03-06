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
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

        if (!RESEND_API_KEY || !supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
            console.error("send-verification-code: Missing environment variables");
            return new Response(JSON.stringify({ error: "Configuração do servidor incompleta (Env vars missing)" }), { status: 500, headers: corsHeaders });
        }

        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
            console.error("send-verification-code: Auth check failed:", authError?.message);
            return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: corsHeaders });
        }

        const body = await req.json();
        const { action } = body;

        if (action === "send") {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

            await supabaseAdmin.from("profiles").update({
                verification_code: code,
                verification_code_expires_at: expiresAt
            }).eq("user_id", user.id);

            // Enviar email via Resend
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: "Audipreve <onboarding@resend.dev>",
                    to: [user.email],
                    subject: `${code} é seu código de verificação Audipreve`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #333;">Verificação de Segurança</h2>
                            <p>Olá,</p>
                            <p>Você está realizando seu primeiro acesso ao sistema Audipreve. Use o código abaixo para verificar sua identidade:</p>
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
                console.error("Erro Resend:", errorData);
                throw new Error("Falha ao enviar e-mail de verificação.");
            }

            return new Response(JSON.stringify({ success: true, message: "Código enviado" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "verify") {
            const { code } = await req.json();
            const { data: profile } = await supabaseAdmin.from("profiles")
                .select("verification_code, verification_code_expires_at")
                .eq("user_id", user.id)
                .single();

            if (!profile || profile.verification_code !== code) {
                return new Response(JSON.stringify({ error: "Código inválido" }), { status: 400, headers: corsHeaders });
            }

            if (new Date() > new Date(profile.verification_code_expires_at)) {
                return new Response(JSON.stringify({ error: "Código expirado" }), { status: 400, headers: corsHeaders });
            }

            await supabaseAdmin.from("profiles").update({
                first_access_done: true,
                verification_code: null,
                verification_code_expires_at: null
            }).eq("user_id", user.id);

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: corsHeaders });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: corsHeaders,
        });
    }
});
