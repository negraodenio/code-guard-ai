-- Migration: 003_architecture_hardening.sql
-- Description: Hardening and scaling infrastructure based on high-level critique

-- 1. HARDENING COMPLIANCE RULES (Versioning & Immutability)
alter table public.compliance_rules
  add column if not exists rule_version text default '1.0.0',
  add column if not exists valid_from timestamp with time zone default now(),
  add column if not exists valid_to timestamp with time zone;

-- 2. DECOUPLING TAXONOMY (Extensibility Fix - Problem A)
alter table public.compliance_changes drop constraint if exists compliance_changes_change_type_check;
-- change_type now accepts any text to allow dynamic rule expansion without migrations

-- 3. STORAGE OPTIMIZATION (Problem B)
alter table public.compliance_changes
  add column if not exists snippet_hash text, -- For deduplication
  add column if not exists storage_ref text; -- Pointer to external object storage (S3/Supabase Storage)

-- 4. CI/CD INTEGRATION (Problem C: PR Tracking)
create table if not exists public.pull_requests (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references public.repositories(id) on delete cascade,
  pr_number text not null,
  title text,
  author text,
  source_branch text,
  target_branch text,
  status text check (status in ('open', 'merged', 'closed', 'blocked')),
  merge_commit_hash text,
  latest_scan_id uuid references public.scans(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(repo_id, pr_number)
);

-- 5. EXECUTIVE ANALYTICS (Problem D: Aggregation)
create table if not exists public.repo_compliance_stats (
  repo_id uuid references public.repositories(id) on delete cascade primary key,
  total_scans int default 0,
  active_violations int default 0,
  blocked_prs_count int default 0,
  top_violated_rule_id text references public.compliance_rules(rule_code),
  compliance_health_score int default 100,
  last_updated_at timestamp with time zone default now()
);

-- 6. AUTOMATED ANALYTICS TRIGGER
create or replace function update_repo_stats()
returns trigger as $$
begin
  update public.repo_compliance_stats
  set 
    total_scans = total_scans + 1,
    active_violations = new.violations_count,
    compliance_health_score = new.score,
    last_updated_at = now()
  where repo_id = new.repo_id;
  
  if not found then
    insert into public.repo_compliance_stats (repo_id, total_scans, active_violations, compliance_health_score)
    values (new.repo_id, 1, new.violations_count, new.score);
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger on_scan_completed
  after insert on public.scans
  for each row execute procedure update_repo_stats();

-- 7. RLS FOR NEW TABLES
alter table public.pull_requests enable row level security;
alter table public.repo_compliance_stats enable row level security;

create policy "Users see their PRs" on public.pull_requests for select 
using (exists (select 1 from public.repositories r where r.id = repo_id and r.user_id = auth.uid()));

create policy "Users see their stats" on public.repo_compliance_stats for select 
using (exists (select 1 from public.repositories r where r.id = repo_id and r.user_id = auth.uid()));
