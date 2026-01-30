-- Migration: 004_enterprise_final.sql
-- Description: Multi-tenancy, Analytics Integrity and Storage Standardization

-- 1. MULTI-TENANCY LAYER (Problem 5: Org/Team)
create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  billing_email text,
  plan_tier text check (plan_tier in ('free', 'pro', 'enterprise')) default 'free',
  created_at timestamp with time zone default now()
);

create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Link profiles to Orgs
alter table public.profiles 
  add column if not exists org_id uuid references public.organizations(id);

-- Link repositories to Teams
alter table public.repositories
  add column if not exists team_id uuid references public.teams(id);

-- 2. ANALYTICS INTEGRITY (Problem 1 & 2: Idempotent Stats)
create or replace function update_repo_stats_final()
returns trigger as $$
begin
  insert into public.repo_compliance_stats (
    repo_id, 
    total_scans, 
    active_violations, 
    compliance_health_score,
    last_updated_at
  )
  select 
    new.repo_id,
    count(*),
    (select coalesce(sum(violations_count), 0) from public.scans where repo_id = new.repo_id order by created_at desc limit 1),
    (select score from public.scans where repo_id = new.repo_id order by created_at desc limit 1),
    now()
  from public.scans
  where repo_id = new.repo_id
  on conflict (repo_id) do update
  set 
    total_scans = excluded.total_scans,
    active_violations = excluded.active_violations,
    compliance_health_score = excluded.compliance_health_score,
    last_updated_at = now();
  
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_scan_completed on public.scans;
create trigger on_scan_completed_final
  after insert or update on public.scans
  for each row execute procedure update_repo_stats_final();

-- 3. STORAGE URI STANDARDIZATION (Problem 4)
alter table public.compliance_changes
  add constraint storage_ref_uri_check 
  check (storage_ref is null or storage_ref ~* '^[a-z0-9]+://[a-z0-9.-]+/.+');

-- 4. RLS FOR ENTERPRISE
alter table public.organizations enable row level security;
alter table public.teams enable row level security;

create policy "Users see their org" on public.organizations for select 
using (id in (select org_id from public.profiles where id = auth.uid()));

create policy "Users see their teams" on public.teams for select 
using (org_id in (select org_id from public.profiles where id = auth.uid()));

-- 5. PERFORMANCE: GIN Index for Graph Scale (Problem 6 mitigation)
create index if not exists idx_code_memory_metadata_gin on public.code_memory using gin (metadata);
create index if not exists idx_repo_nodes_type_path on public.repo_nodes (type, path);
