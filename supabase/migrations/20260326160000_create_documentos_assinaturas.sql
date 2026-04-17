CREATE TYPE status_assinatura AS ENUM ('pendente', 'assinado', 'rejeitado');

CREATE TABLE IF NOT EXISTS documentos_assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL DEFAULT 'Geral',
    file_url VARCHAR(1000) NOT NULL,
    status status_assinatura NOT NULL DEFAULT 'pendente',
    assinatura_pkcs7 TEXT,
    certificado_info JSONB,
    data_assinatura TIMESTAMP WITH TIME ZONE,
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Configuração
ALTER TABLE documentos_assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver documentos da empresa associada" 
    ON documentos_assinaturas FOR SELECT 
    USING (
      public.can_access_empresa(auth.uid(), empresa_id)
    );

CREATE POLICY "Admins e usuarios podem inserir documentos_assinaturas" 
    ON documentos_assinaturas FOR INSERT 
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'user'))
    );

CREATE POLICY "Atualizar assinatura (todos envolvidos)" 
    ON documentos_assinaturas FOR UPDATE 
    USING (
      public.can_access_empresa(auth.uid(), empresa_id)
    );

CREATE POLICY "Admins deletam documentos_assinaturas" 
    ON documentos_assinaturas FOR DELETE 
    USING (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
