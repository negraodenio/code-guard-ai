-- Migration: 002_compliance_diff.sql
-- Description: Detailed change tracking and rules engine for Compliance Diff

-- 1. COMPLIANCE RULES (The Knowledge Base)
create table if not exists public.compliance_rules (
  id uuid default gen_random_uuid() primary key,
  rule_code text unique not null, -- ex: 'LGPD_ART_32_ENCRYPTION'
  framework text not null,        -- ex: 'LGPD', 'GDPR', 'PCI-DSS'
  article text not null,          -- ex: 'Art. 32', 'Art. 25'
  title text not null,
  description text,
  severity_default text check (severity_default in ('critical', 'high', 'medium', 'low')),
  detection_patterns jsonb,       -- AST or Regex patterns
  remediation_template text,      -- Fix code snippet
  auto_fix_available boolean default false,
  fine_min numeric(12,2),
  fine_max numeric(12,2),
  currency text default 'BRL',
  category text,                  -- ex: 'encryption', 'access_control'
  applies_to text[],              -- ex: ['api', 'database']
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. EXPAND SCAN_DIFFS (Adding Intelligence Metrics)
alter table public.scan_diffs
  add column if not exists verdict text check (verdict in ('approved', 'warning', 'blocked')),
  add column if not exists git_base text,
  add column if not exists git_head text,
  add column if not exists framework text,
  add column if not exists score_breakdown jsonb default '{"dataProtection": 0, "accessControl": 0, "logging": 0, "encryption": 0}'::jsonb,
  add column if not exists issues_breakdown jsonb default '{"critical": 0, "high": 0, "medium": 0, "low": 0}'::jsonb,
  add column if not exists recommendation text;

-- 3. COMPLIANCE CHANGES (Granular Change Tracking)
create table if not exists public.compliance_changes (
  id uuid default gen_random_uuid() primary key,
  scan_diff_id uuid references public.scan_diffs(id) on delete cascade,
  commit_hash text,
  pr_number text,
  author text,
  branch text,
  change_type text check (change_type in (
    'field_added',
    'endpoint_added',
    'encryption_removed',
    'logging_added',
    'auth_bypassed',
    'data_retention_changed',
    'secret_exposed'
  )),
  file_path text not null,
  line_start int,
  line_end int,
  severity text check (severity in ('critical', 'high', 'medium', 'low')),
  affected_data text[],
  code_snippet text,
  diff_snippet text,
  violated_articles text[], -- ex: ['LGPD Art. 32']
  framework_impacts jsonb,
  created_at timestamp with time zone default now()
);

-- 4. INDICES
create index if not exists idx_changes_scan_diff on public.compliance_changes(scan_diff_id);
create index if not exists idx_changes_severity on public.compliance_changes(severity);
create index if not exists idx_rules_framework on public.compliance_rules(framework);
create index if not exists idx_scan_diffs_verdict on public.scan_diffs(verdict);

-- 5. RLS & POLICIES
alter table public.compliance_changes enable row level security;
alter table public.compliance_rules enable row level security;

create policy "Users see changes of their scans" on public.compliance_changes for select 
using (exists (
  select 1 from public.scan_diffs sd
  join public.scans s on sd.current_scan_id = s.id
  join public.repositories r on s.repo_id = r.id
  where sd.id = scan_diff_id and r.user_id = auth.uid()
));

create policy "Compliance rules are public" on public.compliance_rules for select using (true);

-- 6. SEED DATA
insert into public.compliance_rules (rule_code, framework, article, title, severity_default, category, fine_min, fine_max) values
('LGPD_ART_32_ENCRYPTION', 'LGPD', 'Art. 32', 'Dados pessoais sem criptografia', 'critical', 'encryption', 50000, 500000),
('LGPD_ART_37_DOCUMENTATION', 'LGPD', 'Art. 37', 'API não documentada', 'high', 'access_control', 10000, 100000),
('GDPR_ART_25_PRIVACY_DESIGN', 'GDPR', 'Art. 25', 'Privacy by Design', 'high', 'encryption', 10000000, 20000000)
on conflict (rule_code) do nothing;
