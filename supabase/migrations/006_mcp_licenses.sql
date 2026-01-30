-- ==========================================
-- MIGRATION: 006_mcp_licenses.sql
-- Sistema de Licenças CodeGuard (API Key + Stripe)
-- ==========================================

-- 1. TABELA PRINCIPAL DE LICENÇAS
create table if not exists public.licenses (
  id uuid default gen_random_uuid() primary key,
  
  -- Identificação
  email text not null,
  api_key text unique not null, -- ex: cg_live_a1b2c3d4...
  
  -- Stripe (referências)
  stripe_customer_id text,
  stripe_subscription_id text,
  
  -- Status e Tier
  status text check (status in ('active', 'canceled', 'past_due', 'trialing')) default 'trialing',
  tier text check (tier in ('free', 'pro', 'enterprise')) default 'free',
  
  -- Rate Limiting (controle de uso)
  requests_this_month int default 0,
  requests_total int default 0,
  month_year text default to_char(now(), 'YYYY-MM'), -- para reset mensal
  
  -- Limites por tier (cache para consulta rápida)
  monthly_limit int generated always as (
    case tier
      when 'free' then 50
      when 'pro' then 10000
      when 'enterprise' then 100000
      else 0
    end
  ) stored,
  
  -- Metadados flexíveis
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Constraints
  constraint valid_email check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  constraint api_key_format check (api_key ~* '^cg_(live|test)_[a-zA-Z0-9]{32,}$')
);

-- 2. ÍNDICES CRÍTICOS
create index if not exists idx_licenses_api_key on public.licenses(api_key);
create index if not exists idx_licenses_email on public.licenses(email);

-- 3. FUNÇÕES AUXILIARES

-- Incrementar contador de requests
create or replace function public.increment_license_requests(
  p_api_key text,
  p_count int default 1
)
returns void
language plpgsql
security definer
as $$
declare
  current_month text;
begin
  current_month := to_char(now(), 'YYYY-MM');
  
  update public.licenses
  set 
    requests_this_month = case 
      when month_year = current_month then requests_this_month + p_count
      else p_count
    end,
    requests_total = requests_total + p_count,
    month_year = current_month,
    updated_at = now()
  where api_key = p_api_key;
end;
$$;

-- Verificar se tem crédito disponível
create or replace function public.check_license_quota(
  p_api_key text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_requests int;
  v_limit int;
  v_status text;
begin
  select requests_this_month, monthly_limit, status
  into v_requests, v_limit, v_status
  from public.licenses
  where api_key = p_api_key;
  
  if not found then return false; end if;
  if v_status not in ('active', 'trialing') then return false; end if;
  return v_requests < v_limit;
end;
$$;

-- 5. ROW LEVEL SECURITY (RLS)
alter table public.licenses enable row level security;

-- Política Service Role
create policy "Service role full access"
  on public.licenses
  for all
  to service_role
  using (true)
  with check (true);

-- Política Anon (MCP Server validation)
create policy "MCP validation access"
  on public.licenses
  for select
  to anon
  using (true);
