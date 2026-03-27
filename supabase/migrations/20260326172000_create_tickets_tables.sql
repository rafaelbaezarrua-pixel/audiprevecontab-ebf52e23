-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    assunto TEXT NOT NULL,
    categoria TEXT DEFAULT 'Geral',
    prioridade TEXT DEFAULT 'media', -- 'baixa', 'media', 'alta'
    status TEXT DEFAULT 'aberto', -- 'aberto', 'em_atendimento', 'concluido', 'fechado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Policies for tickets
CREATE POLICY "Users can view tickets of their company" ON public.tickets
    FOR SELECT USING (
        empresa_id IN (
            SELECT id FROM public.empresas WHERE id = empresa_id
        )
    );

CREATE POLICY "Users can create tickets for their company" ON public.tickets
    FOR INSERT WITH CHECK (true);

-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    mensagem TEXT NOT NULL,
    anexo_url TEXT,
    is_admin_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for ticket_messages
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policies for ticket_messages
CREATE POLICY "Users can view messages of their tickets" ON public.ticket_messages
    FOR SELECT USING (
        ticket_id IN (
            SELECT id FROM public.tickets
        )
    );

CREATE POLICY "Users can send messages to their tickets" ON public.ticket_messages
    FOR INSERT WITH CHECK (true);
