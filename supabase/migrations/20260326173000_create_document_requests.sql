-- Create document_requests table
CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_vencimento DATE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'entregue', 'arquivado')),
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Escritorio pode gerenciar solicitacoes"
    ON document_requests FOR ALL
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'user')));

CREATE POLICY "Clientes podem ver suas proprias solicitacoes"
    ON document_requests FOR SELECT
    USING (public.can_access_empresa(auth.uid(), empresa_id));

CREATE POLICY "Clientes podem fazer upload em suas solicitacoes"
    ON document_requests FOR UPDATE
    USING (public.can_access_empresa(auth.uid(), empresa_id))
    WITH CHECK (public.can_access_empresa(auth.uid(), empresa_id));
