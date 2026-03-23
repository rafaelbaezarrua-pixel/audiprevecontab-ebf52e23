/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-expect-error: Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-expect-error: Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-expect-error: Deno imports
import { Resend } from "https://esm.sh/resend@3.2.0"

// @ts-expect-error: Deno env
const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExpirationAlert {
  empresa_id: string;
  nome_empresa: string;
  email_rfb: string | null;
  documento_tipo: string;
  vencimento: string;
  dias_restantes: number;
  link: string;
}

serve(async (req: Request) => {
  console.log(`${req.method} request received at ${new Date().toISOString()}`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  // @ts-expect-error: Deno env
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Only allow execution if the service key is provided in the header
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    const { test = false } = await req.json().catch(() => ({ test: false }))
    console.log(`Working in ${test ? 'TEST' : 'NORMAL'} mode`)

    const supabaseClient = createClient(
      // @ts-expect-error: Deno env
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-expect-error: Deno env
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Debug: Check if empresa_acessos has any data
    const { count: accessCount } = await supabaseClient.from('empresa_acessos').select('*', { count: 'exact', head: true })
    console.log(`Total rows in empresa_acessos: ${accessCount}`)

    console.log(`--- STEP 1: Fetching expirations ---`)
    const { data: alerts, error: alertsError } = await supabaseClient.rpc('get_daily_expirations', { p_force_all: test })

    if (alertsError) {
      console.error('Error in get_daily_expirations:', alertsError)
      throw alertsError
    }

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No alerts today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const expirations = alerts as ExpirationAlert[]

    // Group by Company
    const companyGroups: Record<string, ExpirationAlert[]> = {}
    expirations.forEach(alert => {
      if (alert.email_rfb && alert.email_rfb.includes('@')) {
        if (!companyGroups[alert.email_rfb]) companyGroups[alert.email_rfb] = []
        companyGroups[alert.email_rfb].push(alert)
      }
    })

    // Group by User
    const userGroups: Record<string, ExpirationAlert[]> = {}
    for (const alert of expirations) {
      const { data: userEmails } = await supabaseClient.rpc('get_company_user_emails', { p_empresa_id: alert.empresa_id })
      if (userEmails && userEmails.length > 0) {
        userEmails.forEach((ue: { email: string }) => {
          if (!userGroups[ue.email]) userGroups[ue.email] = []
          const alreadyExists = userGroups[ue.email].some(a => a.empresa_id === alert.empresa_id && a.documento_tipo === alert.documento_tipo)
          if (!alreadyExists) userGroups[ue.email].push(alert)
        })
      }
    }

    const sendEmail = async (to: string, alerts: ExpirationAlert[], isUser: boolean) => {
      const subject = isUser ? 'Resumo Diário de Vencimentos - Audipreve' : `Aviso de Vencimento de Documentos - ${alerts[0].nome_empresa}`;
      
      let rows = ''
      alerts.forEach(a => {
        const color = a.dias_restantes === 0 ? '#ef4444' : a.dias_restantes <= 7 ? '#f97316' : '#3b82f6'
        const statusText = a.dias_restantes === 0 ? 'Vence HOJE' : `Vence em ${a.dias_restantes} dias`

        rows += `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${isUser ? `<strong>${a.nome_empresa}</strong><br/>` : ''}${a.documento_tipo}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${new Date(a.vencimento).toLocaleDateString('pt-BR')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${color}; font-weight: bold; font-size: 14px;">${statusText}</td>
          </tr>
        `
      })

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://jnqwvysjpbcpbwhlwgqq.supabase.co/storage/v1/object/public/documentos/logo-audipreve.png" alt="Audipreve" style="width: 80px; height: auto;" />
          </div>
          <p>Olá, confira os avisos de vencimento:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead style="background-color: #f9fafb;">
              <tr>
                <th align="left" style="padding: 12px; border-bottom: 2px solid #e5e7eb;">Documento</th>
                <th align="left" style="padding: 12px; border-bottom: 2px solid #e5e7eb;">Vencimento</th>
                <th align="left" style="padding: 12px; border-bottom: 2px solid #e5e7eb;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top: 30px;">Atenciosamente, <br>Audipreve Contabilidade.</p>
        </div>
      `

      try {
        const { data, error } = await resend.emails.send({
          from: 'Audipreve Contabilidade <gestor@audiprevecontabilidade.com.br>',
          to: [to],
          subject: `[Audipreve] ${subject}`,
          html: html
        })
        if (error) return { to, success: false, error }
        return { to, success: true, id: data?.id }
      } catch (err) {
        return { to, success: false, error: err }
      }
    }

    const results = []
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

    for (const [email, companyAlerts] of Object.entries(companyGroups)) {
      results.push(await sendEmail(email, companyAlerts, false))
      await delay(250)
    }

    for (const [email, userAlerts] of Object.entries(userGroups)) {
      results.push(await sendEmail(email, userAlerts, true))
      await delay(250)
    }

    return new Response(JSON.stringify({
      success: true,
      totalEmailsAttempted: results.length,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error("Critical Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
