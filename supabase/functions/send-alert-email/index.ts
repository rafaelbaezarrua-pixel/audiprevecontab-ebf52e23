// @ts-ignore: Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-ignore: Deno
import { Resend } from "https://esm.sh/resend@3.2.0"

// @ts-ignore: Deno
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

  try {
    const { test = false } = await req.json().catch(() => ({ test: false }))
    console.log(`Working in ${test ? 'TEST' : 'NORMAL'} mode`)

    const supabaseClient = createClient(
      // @ts-ignore: Deno
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Debug: Check if empresa_acessos has any data
    const { count: accessCount } = await supabaseClient.from('empresa_acessos').select('*', { count: 'exact', head: true })
    console.log(`Total rows in empresa_acessos: ${accessCount}`)

    console.log(`--- STEP 1: Fetching expirations (force_all: ${test}) ---`)
    const { data: alerts, error: alertsError } = await supabaseClient.rpc('get_daily_expirations', { p_force_all: test })

    if (alertsError) {
      console.error('Error in get_daily_expirations:', alertsError)
      throw alertsError
    }

    if (!alerts || alerts.length === 0) {
      console.log('No expirations found for today (using 30, 15, 7, 1, 0 days filter).')
      return new Response(JSON.stringify({
        success: true,
        message: 'No alerts today',
        debug: { expirationsFound: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log(`--- STEP 1.5: Fetching templates ---`)
    const { data: templates } = await supabaseClient.from('email_templates').select('*')
    const companyTemplate = templates?.find((t: any) => t.template_type === 'company_alert') || {
      subject: 'Aviso de Vencimento de Documentos - {{nome_empresa}}',
      body_html: 'Olá, informamos que os seguintes documentos da empresa <strong>{{nome_empresa}}</strong> estão próximos ao vencimento:'
    }
    const userTemplate = templates?.find((t: any) => t.template_type === 'user_summary') || {
      subject: 'Resumo Diário de Vencimentos - Audipreve',
      body_html: 'Confira os documentos das empresas sob sua gestão que vencem em breve:'
    }
    console.log(`Loaded ${templates?.length || 0} templates.`)

    const expirations = alerts as ExpirationAlert[]
    console.log(`Found ${expirations.length} total expirations.`)

    // 1. Group by Company (for email_rfb)
    console.log('--- STEP 2: Grouping by Company (Direct Email) ---')
    const companyGroups: Record<string, ExpirationAlert[]> = {}
    expirations.forEach(alert => {
      if (alert.email_rfb && alert.email_rfb.includes('@')) {
        if (!companyGroups[alert.email_rfb]) companyGroups[alert.email_rfb] = []
        companyGroups[alert.email_rfb].push(alert)
      } else {
        console.log(`Company "${alert.nome_empresa}" has no valid contact email: "${alert.email_rfb}"`)
      }
    })

    // 2. Group by User (mapping company_id to user emails)
    console.log('--- STEP 3: Grouping by System User (get_company_user_emails) ---')
    const userGroups: Record<string, ExpirationAlert[]> = {}
    for (const alert of expirations) {
      console.log(`Checking users for company: ${alert.nome_empresa} (${alert.empresa_id})`)
      const { data: userEmails, error: rpcError } = await supabaseClient.rpc('get_company_user_emails', { p_empresa_id: alert.empresa_id })

      if (rpcError) {
        console.error(`Error fetching users for company ${alert.empresa_id}:`, rpcError)
        continue
      }

      if (userEmails && userEmails.length > 0) {
        console.log(`Found ${userEmails.length} users linked to ${alert.nome_empresa}:`, userEmails.map((u: any) => u.email).join(', '))
        userEmails.forEach((ue: { email: string }) => {
          if (!userGroups[ue.email]) userGroups[ue.email] = []
          // Check if this alert is already in the user's list (to avoid duplicates if company has multiple docs)
          const alreadyExists = userGroups[ue.email].some(a => a.empresa_id === alert.empresa_id && a.documento_tipo === alert.documento_tipo)
          if (!alreadyExists) userGroups[ue.email].push(alert)
        })
      } else {
        console.log(`No system users found with access to company ${alert.nome_empresa}`)
      }
    }

    console.log(`--- SUMMARY ---`)
    console.log(`Unique Companies to notify: ${Object.keys(companyGroups).length}`)
    console.log(`Unique Users to notify: ${Object.keys(userGroups).length}`)

    const sendEmail = async (to: string, alerts: ExpirationAlert[], isUser: boolean) => {
      console.log(`Attempting to send ${isUser ? 'USER' : 'COMPANY'} email to: ${to}`)

      const template = isUser ? userTemplate : companyTemplate;

      let subject = template.subject.replace(/{{nome_empresa}}/g, alerts[0].nome_empresa)
      let customIntro = template.body_html.replace(/{{nome_empresa}}/g, alerts[0].nome_empresa)

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
          ${customIntro}
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
          <p style="margin-top: 30px;">Esse email é um aviso automatico, as providencias para a renovação já forma tomas! Entre em contato para quais dúvidas
          Atenciosamente, 
          Audipreve Contabilidade.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">Este é um e-mail automático. Não responder!</p>
        </div>
      `

      try {
        const { data, error } = await resend.emails.send({
          from: 'Audipreve Contabilidade <gestor@audiprevecontabilidade.com.br>',
          to: [to],
          subject: `[Audipreve] ${subject}`,
          html: html
        })

        if (error) {
          console.error(`Resend error sending to ${to}:`, error)
          return { to, success: false, error }
        }

        console.log(`Email sent successfully to ${to}. ID: ${data?.id}`)
        return { to, success: true }
      } catch (err) {
        console.error(`Exception sending to ${to}:`, err)
        return { to, success: false, error: err }
      }
    }

    // Execution
    const results = []

    // Helper for minor delay to respect 5 req/sec limit
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

    // Company Emails
    for (const [email, companyAlerts] of Object.entries(companyGroups)) {
      results.push(await sendEmail(email, companyAlerts, false))
      await delay(250) // 250ms delay -> roughly 4 emails per second
    }

    // User Emails
    for (const [email, userAlerts] of Object.entries(userGroups)) {
      results.push(await sendEmail(email, userAlerts, true))
      await delay(250)
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount
    const errors = results.filter(r => !r.success).map(r => ({ to: r.to, error: r.error }))

    return new Response(JSON.stringify({
      success: true,
      companiesNotified: Object.keys(companyGroups).length,
      usersNotified: Object.keys(userGroups).length,
      totalEmailsAttempted: results.length,
      successCount,
      failCount,
      debug: {
        expirationsFound: expirations.length,
        accessRowsFound: accessCount,
        testMode: test,
        errors: errors
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error("Critical Error in Edge Function:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
