import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@3.2.0"

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Fetching daily expirations...')
    const { data: alerts, error: alertsError } = await supabaseClient.rpc('get_daily_expirations')
    
    if (alertsError) throw alertsError
    if (!alerts || alerts.length === 0) {
      console.log('No expirations to notify today.')
      return new Response(JSON.stringify({ success: true, message: 'No alerts today' }), { status: 200 })
    }

    const expirations = alerts as ExpirationAlert[]
    
    // 1. Group by Company (for email_rfb)
    const companyGroups: Record<string, ExpirationAlert[]> = {}
    expirations.forEach(alert => {
      if (alert.email_rfb) {
        if (!companyGroups[alert.email_rfb]) companyGroups[alert.email_rfb] = []
        companyGroups[alert.email_rfb].push(alert)
      }
    })

    // 2. Group by User (mapping company_id to user emails)
    const userGroups: Record<string, ExpirationAlert[]> = {}
    for (const alert of expirations) {
      const { data: userEmails } = await supabaseClient.rpc('get_company_user_emails', { p_empresa_id: alert.empresa_id })
      if (userEmails) {
        userEmails.forEach((ue: { email: string }) => {
          if (!userGroups[ue.email]) userGroups[ue.email] = []
          userGroups[ue.email].push(alert)
        })
      }
    }

    console.log(`Processing ${Object.keys(companyGroups).length} company emails and ${Object.keys(userGroups).length} user emails.`)

    const sendEmail = async (to: string, subject: string, alerts: ExpirationAlert[], isUser: boolean) => {
      const title = isUser ? "Resumo Diário de Vencimentos" : `Alerta de Vencimento - ${alerts[0].nome_empresa}`
      const intro = isUser 
        ? "Confira os documentos das empresas sob sua gestão que vencem em breve:" 
        : `Olá, informamos que os seguintes documentos da empresa <strong>${alerts[0].nome_empresa}</strong> estão próximos ao vencimento:`

      let rows = ''
      alerts.forEach(a => {
        const color = a.dias_restantes === 0 ? '#ef4444' : a.dias_restantes <= 7 ? '#f97316' : '#3b82f6'
        const statusText = a.dias_restantes === 0 ? 'Vence HOJE' : `Vence em ${a.dias_restantes} dias`
        
        rows += `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${isUser ? `<strong>${a.nome_empresa}</strong><br/>` : ''}${a.documento_tipo}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(a.vencimento).toLocaleDateString('pt-BR')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${color}; font-weight: bold;">${statusText}</td>
          </tr>
        `
      })

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
          <h2 style="color: #1e40af;">${title}</h2>
          <p>${intro}</p>
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
          <p style="margin-top: 30px;">Por favor, acesse o sistema para tomar as providências necessárias.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">Este é um e-mail automático enviado pelo sistema Audipreve Contabilidade.</p>
        </div>
      `

      return resend.emails.send({
        from: 'Audipreve <onboarding@resend.dev>',
        to: [to],
        subject: `[Audipreve] ${subject}`,
        html: html
      })
    }

    // Execution
    const emailPromises = []

    // Company Emails
    for (const [email, companyAlerts] of Object.entries(companyGroups)) {
      emailPromises.push(sendEmail(email, `Vencimento de Documentos`, companyAlerts, false))
    }

    // User Emails
    for (const [email, userAlerts] of Object.entries(userGroups)) {
      emailPromises.push(sendEmail(email, `Resumo de Vencimentos`, userAlerts, true))
    }

    await Promise.all(emailPromises)

    return new Response(JSON.stringify({ 
      success: true, 
      companiesNotified: Object.keys(companyGroups).length,
      usersNotified: Object.keys(userGroups).length
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    })

  } catch (error) {
    console.error("Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400 
    })
  }
})
