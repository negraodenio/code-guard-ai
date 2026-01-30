-- =================================================================
-- MASTER MIGRATION: 000_FULL_ENTERPRISE_ARCHITECT.sql
-- VERSION: v8.6.0-ULTRA
-- DESCRIPTION: Full consolidated infrastructure for Compliance MCP
-- =================================================================

-- 1. EXTENSIONS
create extension if not exists vector;
create extension if not exists pg_trgm;

-- 2. ORGANIZATIONS (Multi-tenancy Root)
create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  billing_email text,
  plan_tier text check (plan_tier in ('free', 'pro', 'enterprise')) default 'free',
  created_at timestamp with time zone default now()
);

-- 3. TEAMS
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- 4. PROFILES (Auth & Billing)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  org_id uuid references public.organizations(id) on delete set null,
  stripe_customer_id text,
  subscription_status text check (subscription_status in ('free', 'pro', 'enterprise')) default 'free',
  subscription_expires_at timestamp with time zone,
  scan_credits_remaining int default 100,
  created_at timestamp with time zone default now()
);

-- 5. REPOSITORIES (The Node Nexus)
create table if not exists public.repositories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  url text not null,
  name text,
  context_type text check (context_type in ('library', 'application', 'api_spec', 'cli')),
  analyzed_at timestamp with time zone,
  repo_graph jsonb,
  trust_zones jsonb,
  last_scan_score int,
  stability_score float default 1.0,
  commit_frequency float default 0.0,
  blake3_signature text,
  created_at timestamp with time zone default now()
);

-- 6. CODE MEMORY (RAG - Vector Store)
create table if not exists public.code_memory (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references public.repositories(id) on delete cascade,
  file_path text not null,
  chunk_type text check (chunk_type in ('function', 'class', 'import', 'config', 'example')),
  content text,
  embedding vector(1536), -- Optimized for 1536d models
  ast_fingerprint text,
  compliance_signature jsonb default '{}'::jsonb,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- 7. SCANS & VIOLATIONS
create table if not exists public.scans (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references public.repositories(id) on delete cascade,
  score int,
  classification text,
  violations_count int,
  raw_report jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.violations (
  id uuid default gen_random_uuid() primary key,
  scan_id uuid references public.scans(id) on delete cascade,
  rule_id text,
  severity text,
  file_path text,
  line_start int,
  line_end int,
  code_snippet text,
  is_false_positive boolean default false,
  confidence float,
  remediation_snippet text,
  metadata jsonb
);

-- 8. COMPLIANCE RULES (Knowledge Base)
create table if not exists public.compliance_rules (
  id uuid default gen_random_uuid() primary key,
  rule_code text unique not null,
  framework text not null,
  article text not null,
  title text not null,
  description text,
  severity_default text check (severity_default in ('critical', 'high', 'medium', 'low')),
  rule_version text default '1.0.0',
  valid_from timestamp with time zone default now(),
  valid_to timestamp with time zone,
  detection_patterns jsonb,
  remediation_template text,
  auto_fix_available boolean default false,
  fine_min numeric(12,2),
  fine_max numeric(12,2),
  currency text default 'BRL',
  category text,
  applies_to text[],
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 9. SCAN DIFFS (Evolution Tracker)
create table if not exists public.scan_diffs (
  id uuid default gen_random_uuid() primary key,
  previous_scan_id uuid references public.scans(id) on delete cascade,
  current_scan_id uuid references public.scans(id) on delete cascade,
  added_violations_count int,
  resolved_violations_count int,
  score_delta int,
  verdict text check (verdict in ('approved', 'warning', 'blocked')),
  git_base text,
  git_head text,
  framework text,
  score_breakdown jsonb,
  issues_breakdown jsonb,
  recommendation text,
  created_at timestamp with time zone default now()
);

-- 10. COMPLIANCE CHANGES (Granular Change Tracking)
create table if not exists public.compliance_changes (
  id uuid default gen_random_uuid() primary key,
  scan_diff_id uuid references public.scan_diffs(id) on delete cascade,
  commit_hash text,
  change_type text, -- Dynamic (Decoupled from 003)
  file_path text not null,
  line_start int,
  severity text check (severity in ('critical', 'high', 'medium', 'low')),
  snippet_hash text,
  storage_ref text,
  violated_articles text[],
  framework_impacts jsonb,
  created_at timestamp with time zone default now(),
  constraint storage_ref_uri_check check (storage_ref is null or storage_ref ~* '^[a-z0-9]+://[a-z0-9.-]+/.+')
);

-- 11. PULL REQUESTS (CI/CD Integration)
create table if not exists public.pull_requests (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references public.repositories(id) on delete cascade,
  pr_number text not null,
  title text,
  author text,
  status text check (status in ('open', 'merged', 'closed', 'blocked')) default 'open',
  latest_scan_id uuid references public.scans(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(repo_id, pr_number)
);

-- 12. ANALYTICS & STATS
create table if not exists public.repo_compliance_stats (
  repo_id uuid references public.repositories(id) on delete cascade primary key,
  total_scans int default 0,
  active_violations int default 0,
  blocked_prs_count int default 0,
  top_violated_rule_id text references public.compliance_rules(rule_code) on delete set null,
  compliance_health_score int default 100,
  last_updated_at timestamp with time zone default now()
);

-- 13. MATERIALIZED VIEW: TRENDS
create materialized view if not exists public.compliance_trends as
select 
  r.id as repo_id,
  r.name as repo_name,
  r.user_id,
  json_agg(json_build_object('date', s.created_at, 'score', s.score) order by s.created_at) as score_history,
  (select score from public.scans where repo_id = r.id order by created_at desc limit 1) as latest_score
from public.repositories r
left join public.scans s on r.id = s.repo_id
group by r.id, r.name, r.user_id;

create unique index if not exists idx_trends_repo_id on public.compliance_trends(repo_id);

-- 14. FUNCTIONS & TRIGGERS
create or replace function public.handle_new_user()
returns trigger as $$ begin
  insert into public.profiles (id, scan_credits_remaining) values (new.id, 100);
  return new;
end; $$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function update_repo_stats_final()
returns trigger as $$ begin
  insert into public.repo_compliance_stats (repo_id, total_scans, active_violations, compliance_health_score, last_updated_at)
  select new.repo_id, count(*), (select coalesce(sum(violations_count), 0) from public.scans where repo_id = new.repo_id order by created_at desc limit 1),
  (select score from public.scans where repo_id = new.repo_id order by created_at desc limit 1), now()
  from public.scans where repo_id = new.repo_id
  on conflict (repo_id) do update set total_scans = excluded.total_scans, active_violations = excluded.active_violations, compliance_health_score = excluded.compliance_health_score, last_updated_at = now();
  return new;
end; $$ language plpgsql;

create trigger on_scan_completed_final after insert on public.scans for each row execute procedure update_repo_stats_final();

-- 15. RLS (Basic Enterprise)
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.repositories enable row level security;

create policy "Users see their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users see their repositories" on public.repositories for all using (user_id = auth.uid());
