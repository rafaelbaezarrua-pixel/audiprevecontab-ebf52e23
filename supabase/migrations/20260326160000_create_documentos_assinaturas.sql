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
      auth.uid() IN (
        SELECT user_id FROM perfis p WHERE p.is_admin = true
        UNION
        SELECT user_id FROM empresa_acessos ea WHERE ea.empresa_id = documentos_assinaturas.empresa_id
      )
    );

CREATE POLICY "Admins podem inserir documentos_assinaturas" 
    ON documentos_assinaturas FOR INSERT 
    WITH CHECK (
      EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Atualizar assinatura (todos envolvidos)" 
    ON documentos_assinaturas FOR UPDATE 
    USING (
      auth.uid() IN (
        SELECT user_id FROM perfis p WHERE p.is_admin = true
        UNION
        SELECT user_id FROM empresa_acessos ea WHERE ea.empresa_id = documentos_assinaturas.empresa_id
      )
    );

CREATE POLICY "Admins deletam documentos_assinaturas" 
    ON documentos_assinaturas FOR DELETE 
    USING (
      EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND is_admin = true)
    );
