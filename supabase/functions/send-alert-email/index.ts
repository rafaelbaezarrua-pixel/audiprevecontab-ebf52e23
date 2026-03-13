import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@3.2.0"

// Configure Resend API Key
const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Fetching soon-to-expire certificates and licenses...')

    const today = new Date()
    const alertThreshold = new Date(today)
    alertThreshold.setDate(today.getDate() + 30) // 30 days notice

    // Example: Fetching Certificados Digitais expiring in <= 30 days that are still Active
    const { data: certificados, error: certError } = await supabaseClient
      .from('certificados_digitais')
      .select('*, empresas(nome_empresa, cnpj)')
      .lte('vencimento', alertThreshold.toISOString().split('T')[0])
      .gte('vencimento', today.toISOString().split('T')[0])
      .eq('status', 'ativo')

    if (certError) throw certError

    if (certificados && certificados.length > 0) {
      console.log(`Found ${certificados.length} certificates near expiration.`)

      // Format HTML for email
      let htmlContent = `
        <h2>Alerta de Vencimentos - Contabilidade</h2>
        <p>Os seguintes Certificados Digitais vencerão nos próximos 30 dias:</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <tr style="background-color: #f3f4f6;">
            <th align="left">Empresa</th>
            <th align="left">CNPJ</th>
            <th align="left">Tipo</th>
            <th align="left">Vencimento</th>
          </tr>
      `;

      certificados.forEach((cert) => {
        const empresaName = cert.empresas?.nome_empresa || 'N/A'
        const empresaCnpj = cert.empresas?.cnpj || 'N/A'
        const dataVenc = new Date(cert.vencimento).toLocaleDateString('pt-BR')
        
        htmlContent += `
          <tr>
            <td>${empresaName}</td>
            <td>${empresaCnpj}</td>
            <td>${cert.tipo || 'N/A'}</td>
            <td><strong style="color: #ef4444;">${dataVenc}</strong></td>
          </tr>
        `
      })

      htmlContent += `</table><p>Acesse o sistema para renová-los.</p>`

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Audipreve Alertas <onboarding@resend.dev>', // Should use verified domain in production
        to: [Deno.env.get('ALERT_EMAIL_DESTINATION') || 'rafaelbaezarrua@gmail.com'], // Fallback or env mapped
        subject: `[Alerta] ${certificados.length} Certificados Vencendo em Breve`,
        html: htmlContent,
      })

      if (emailError) {
        console.error("Resend Error:", emailError)
        throw emailError
      }

      console.log("Email sent successfully:", emailData)
    } else {
      console.log("No certificates expiring soon.")
    }

    return new Response(JSON.stringify({ success: true, count: certificados?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error executing send-alert-email:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
