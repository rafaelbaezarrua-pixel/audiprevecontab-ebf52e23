-- Create document_requests table
CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE POLICY "Escritório pode gerenciar solicitações"
    ON document_requests FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'funcionario')));

CREATE POLICY "Clientes podem ver suas próprias solicitações"
    ON document_requests FOR SELECT
    USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Clientes podem fazer upload em suas solicitações"
    ON document_requests FOR UPDATE
    USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));
