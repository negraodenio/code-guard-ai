-- Migration: 005_enterprise_hardening.sql
-- Description: Cascading deletes, Materialized Views, and PR State Automation

-- 1. FIXING REMAINING FOREIGN KEYS (The "3NF Integrity" Layer)
-- scan_diffs: Ensure diffs vanish if scans are deleted
alter table public.scan_diffs 
  drop constraint if exists scan_diffs_previous_scan_id_fkey,
  drop constraint if exists scan_diffs_current_scan_id_fkey;

alter table public.scan_diffs
  add constraint scan_diffs_previous_scan_id_fkey 
    foreign key (previous_scan_id) references public.scans(id) on delete cascade,
  add constraint scan_diffs_current_scan_id_fkey 
    foreign key (current_scan_id) references public.scans(id) on delete cascade;

-- pull_requests: Keep PR record but clear scan reference if scan is deleted
alter table public.pull_requests
  drop constraint if exists pull_requests_latest_scan_id_fkey;

alter table public.pull_requests
  add constraint pull_requests_latest_scan_id_fkey 
    foreign key (latest_scan_id) references public.scans(id) on delete set null;

-- stats: Top violated rule link
alter table public.repo_compliance_stats
  drop constraint if exists repo_compliance_stats_top_violated_rule_id_fkey;

alter table public.repo_compliance_stats
  add constraint repo_compliance_stats_top_violated_rule_id_fkey 
    foreign key (top_violated_rule_id) references public.compliance_rules(rule_code) on delete set null;

-- 2. MATERIALIZED VIEW: COMPLIANCE TRENDS (The "Executive Dashboard")
create materialized view if not exists public.compliance_trends as
select 
  r.id as repo_id,
  r.name as repo_name,
  r.user_id,
  
  -- Historical Evolution (JSON Aggregations)
  json_agg(
    json_build_object(
      'date', s.created_at,
      'score', s.score,
      'violations', s.violations_count
    ) order by s.created_at
  ) as score_history,
  
  -- Latest Snapshots
  (select score from public.scans where repo_id = r.id order by created_at desc limit 1) as latest_score,
  (select classification from public.scans where repo_id = r.id order by created_at desc limit 1) as latest_classification,
  
  -- Risk Metrics
  (select count(*) from public.scan_diffs sd 
   join public.scans s2 on sd.current_scan_id = s2.id 
   where s2.repo_id = r.id and sd.verdict = 'blocked') as blocked_merges_count
   
from public.repositories r
left join public.scans s on r.id = s.repo_id
group by r.id, r.name, r.user_id;

create unique index if not exists idx_compliance_trends_repo_id on public.compliance_trends(repo_id);

-- 3. PR AUTOMATION: VERDICT ENGINE
create or replace function handle_pr_compliance_status()
returns trigger as $$
begin
  -- If the scan attached to the PR has a negative verdict, block the PR automatically
  if exists (
    select 1 from public.scan_diffs sd 
    where sd.current_scan_id = new.latest_scan_id and sd.verdict = 'blocked'
  ) then
    new.status := 'blocked';
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger on_pr_scan_update
  before insert or update of latest_scan_id on public.pull_requests
  for each row execute procedure handle_pr_compliance_status();

-- 4. HOUSEKEEPING: REFRESH TRENDS
create or replace function refresh_compliance_trends()
returns trigger as $$
begin
  -- Non-concurrent refresh for simplicity in migration, can be adjusted for scale
  refresh materialized view public.compliance_trends;
  return null;
end;
$$ language plpgsql;

create trigger on_scan_refresh_view
  after insert on public.scans
  for each row execute procedure refresh_compliance_trends();
