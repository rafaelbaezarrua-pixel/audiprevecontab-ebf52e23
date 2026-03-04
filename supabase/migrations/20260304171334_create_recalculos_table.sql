create table if not exists public.recalculos (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid references public.empresas(id) on delete cascade not null,
  modulo_origem text not null,
  competencia text not null,
  guia text not null,
  data_recalculo date,
  data_envio date,
  forma_envio text,
  status public.guia_status default 'pendente',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
alter table public.recalculos enable row level security;

create policy "Enable all actions for authenticated users"
  on public.recalculos for all
  using ( auth.role() = 'authenticated' )
  with check ( auth.role() = 'authenticated' );
