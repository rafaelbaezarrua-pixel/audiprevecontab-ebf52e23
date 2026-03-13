-- Migration: 20240313180000_notification_rules.sql
-- Create notification_rules table for persistent configuration of alert triggers

create table if not exists public.notification_rules (
    id uuid default gen_random_uuid() primary key,
    module_id text not null, -- e.g., 'licencas', 'certificados', 'procuracoes'
    trigger_name text not null, -- e.g., 'Alvará de Funcionamento', 'e-CNPJ'
    days_before integer not null default 7,
    is_active boolean default true,
    created_at timestamp with time zone default now()
);

-- RLS
alter table public.notification_rules enable row level security;

-- Policies
create policy "Admins can manage notification rules"
    on public.notification_rules
    for all
    using (
        exists (
            select 1 from public.user_roles
            where user_id = auth.uid()
            and role = 'admin'
        )
    );

create policy "Users can view notification rules"
    on public.notification_rules
    for select
    using (true);

-- Insert initial default rules based on mock data
insert into public.notification_rules (module_id, trigger_name, days_before, is_active)
values 
    ('licencas', 'Alvará de Funcionamento', 15, true),
    ('certificados', 'e-CNPJ', 7, true),
    ('vencimentos', 'Guia Simples Nacional', 3, false);
