-- Migration to add email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT NOT NULL UNIQUE, -- 'company_alert' ou 'user_summary'
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ler templates" ON public.email_templates;
CREATE POLICY "Todos podem ler templates" ON public.email_templates
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Apenas admins podem modificar templates" ON public.email_templates;
CREATE POLICY "Apenas admins podem modificar templates" ON public.email_templates
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Insert default templates if they don't exist
INSERT INTO public.email_templates (template_type, subject, body_html)
VALUES 
(
    'company_alert', 
    'Aviso de Vencimento de Documentos - {{nome_empresa}}', 
    'Olá, informamos que os seguintes documentos da empresa <strong>{{nome_empresa}}</strong> estão próximos ao vencimento:'
),
(
    'user_summary', 
    'Resumo Diário de Vencimentos - Audipreve', 
    'Confira os documentos das empresas sob sua gestão que vencem em breve:'
)
ON CONFLICT (template_type) DO NOTHING;
