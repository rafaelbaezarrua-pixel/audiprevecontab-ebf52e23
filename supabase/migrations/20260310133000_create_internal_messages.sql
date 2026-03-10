-- ============================================
-- INTERNAL MESSAGES SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.internal_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    subject TEXT,
    content TEXT NOT NULL,
    lida BOOLEAN DEFAULT false,
    direcao TEXT DEFAULT 'cliente_para_escritorio',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins manage internal_messages" ON public.internal_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients see relevant messages" ON public.internal_messages 
FOR SELECT 
USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR 
    empresa_id IN (
        SELECT empresa_id FROM public.empresa_acessos WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Clients insert messages" ON public.internal_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);
