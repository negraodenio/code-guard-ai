-- Migration: 001_initial_schema.sql
-- Description: Core infrastructure for Compliance MCP Server (v4.0.0-PRO)

-- 1. EXTENSIONS
create extension if not exists vector;
create extension if not exists pg_trgm;

-- 2. PROFILES (Auth & Billing)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  stripe_customer_id text,
  subscription_status text check (subscription_status in ('free', 'pro', 'enterprise')) default 'free',
  subscription_expires_at timestamp with time zone,
  scan_credits_remaining int default 100,
  created_at timestamp with time zone default now()
);

-- 3. REPOSITORIES (Repo Intelligence Layer)
create table if not exists public.repositories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  url text not null,
  name text,
  context_type text check (context_type in ('library', 'application', 'api_spec', 'cli')),
  analyzed_at timestamp with time zone,
  repo_graph jsonb,
  trust_zones jsonb,
  last_scan_score int,
  created_at timestamp with time zone default now()
);

-- 4. CODE MEMORY (RAG - Vector Store)
create table if not exists public.code_memory (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references public.repositories(id) on delete cascade,
  file_path text not null,
  chunk_type text check (chunk_type in ('function', 'class', 'import', 'config', 'example')),
  content text,
  embedding vector(1536), -- Designed for text-embedding-3-small
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- 5. SCANS & VIOLATIONS
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

-- 6. DATA LINEAGE (Governance Graph)
create table if not exists public.data_lineage (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references public.repositories(id) on delete cascade,
  source_node text not null, -- ex: "DB_USER_TABLE"
  sink_node text not null,   -- ex: "CONSOLE_LOG"
  data_type text,            -- ex: "PII_CPF", "CREDENTIAL_SECRET"
  risk_level text check (risk_level in ('critical', 'high', 'medium', 'low')),
  transformations text[],    -- ex: ['hash', 'mask']
  last_detected_at timestamp with time zone default now()
);

-- 7. FINOPS & INFRASTRUCTURE LOGS
create table if not exists public.finops_history (
  id uuid default gen_random_uuid() primary key,
  scan_id uuid references public.scans(id) on delete cascade,
  service_name text not null, -- ex: "AWS_RDS"
  estimated_monthly_cost numeric(10,2),
  optimization_suggestion text,
  carbon_footprint_kg numeric(10,2),
  detected_pattern text, -- ex: "N+1_LOOP"
  created_at timestamp with time zone default now()
);

-- 8. ACCESSIBILITY AUDITS (WCAG 2.2)
create table if not exists public.a11y_audits (
  id uuid default gen_random_uuid() primary key,
  scan_id uuid references public.scans(id) on delete cascade,
  rule_id text not null, -- ex: "WCAG_1.1.1"
  impact text check (impact in ('critical', 'serious', 'moderate', 'minor')),
  file_path text,
  element_html text,
  fix_suggestion text,
  created_at timestamp with time zone default now()
);

-- 9. CERTIFIED BLUEPRINTS (Central Reference)
create table if not exists public.certified_blueprints (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null, -- ex: "lgpd-safe-logger"
  framework text,           -- ex: "LGPD", "FAPI-BR"
  version text,
  content text not null,
  is_active boolean default true,
  updated_at timestamp with time zone default now()
);

-- 10. ADVANCED MATCH FUNCTION (Vector + Metadata)
create or replace function match_code_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  repo_filter uuid,
  chunk_filter text default null
) returns table(
  id uuid,
  file_path text,
  content text,
  chunk_type text,
  similarity float
) language sql stable as $$
  select 
    id,
    file_path,
    content,
    chunk_type,
    1 - (code_memory.embedding <=> query_embedding) as similarity
  from public.code_memory
  where repo_id = repo_filter 
    and (chunk_filter is null or chunk_type = chunk_filter)
    and 1 - (code_memory.embedding <=> query_embedding) > match_threshold
  order by code_memory.embedding <=> query_embedding
  limit match_count;
$$;

-- 11. AUTOMATION: Create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, scan_credits_remaining)
  values (new.id, 100);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 12. RLS & PRIVILEGES
alter table public.data_lineage enable row level security;
alter table public.finops_history enable row level security;
alter table public.a11y_audits enable row level security;
alter table public.certified_blueprints enable row level security;

create policy "Users can see lineage of their repos" on public.data_lineage for select 
using (exists (select 1 from public.repositories r where r.id = repo_id and r.user_id = auth.uid()));

-- 13. REPO TOPOLOGY (The "Nerve System")
create table if not exists public.repo_topology (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references public.repositories(id) on delete cascade,
  source_file text not null,
  target_file text not null,
  relation_type text check (relation_type in ('import', 'call', 'data_flow')),
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- 14. BASELINE AUDITS (The "Memory of Decisions")
create table if not exists public.baseline_audits (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references public.repositories(id) on delete cascade,
  file_hash text not null, -- SHA-256 of the content
  violation_signature text not null, -- Unique ID of the rule + location context
  decision text check (decision in ('accepted', 'ignored', 'false_positive')),
  reasoning text,
  decided_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  unique(repo_id, violation_signature)
);

-- 15. SCAN DIFFS (Evolution Tracker)
create table if not exists public.scan_diffs (
  id uuid default gen_random_uuid() primary key,
  previous_scan_id uuid references public.scans(id),
  current_scan_id uuid references public.scans(id),
  added_violations_count int,
  resolved_violations_count int,
  score_delta int,
  created_at timestamp with time zone default now()
);

-- Indices for Performance
create index if not exists idx_code_memory_repo on public.code_memory(repo_id);
create index if not exists idx_topology_repo on public.repo_topology(repo_id);
create index if not exists idx_baseline_hash on public.baseline_audits(file_hash);

-- RLS for new tables
alter table public.repo_topology enable row level security;
alter table public.baseline_audits enable row level security;
alter table public.scan_diffs enable row level security;

create policy "Users see their repo topology" on public.repo_topology for select 
using (exists (select 1 from public.repositories r where r.id = repo_id and r.user_id = auth.uid()));

-- 16. VIBE INTELLIGENCE (Temporal & High-Fidelity)
alter table public.repositories 
add column if not exists stability_score float default 1.0,
add column if not exists commit_frequency float default 0.0,
add column if not exists blake3_signature text;

alter table public.code_memory
add column if not exists ast_fingerprint text,
add column if not exists compliance_signature jsonb default '{}'::jsonb;

-- 17. REPO GRAPH (The High-Dimensional Nexus)
create table if not exists public.repo_nodes (
  id text primary key, -- uri#line or blake3_hash
  repo_id uuid references public.repositories(id) on delete cascade,
  path text not null,
  type text check (type in ('function', 'class', 'variable', 'api_endpoint', 'component')),
  ast_hash text,
  embedding vector(1024), -- Optimized for BGE-large (1024) or M3
  last_validated timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table if not exists public.repo_edges (
  id uuid default gen_random_uuid() primary key,
  source_node_id text references public.repo_nodes(id) on delete cascade,
  target_node_id text references public.repo_nodes(id) on delete cascade,
  edge_type text check (edge_type in ('calls', 'imports', 'implements', 'violates')),
  weight float default 1.0,
  created_at timestamp with time zone default now()
);

-- Advanced Graph Search
create or replace function get_semantic_neighbors(
  target_node_id text,
  min_similarity float default 0.85
) returns table(
  node_id text,
  similarity float
) language sql stable as $$
  select 
    n2.id as node_id,
    1 - (n1.embedding <=> n2.embedding) as similarity
  from public.repo_nodes n1, public.repo_nodes n2
  where n1.id = target_node_id
    and n1.repo_id = n2.repo_id
    and n1.id != n2.id
    and 1 - (n1.embedding <=> n2.embedding) > min_similarity
  order by 2 desc;
$$;

-- RLS
alter table public.repo_nodes enable row level security;
alter table public.repo_edges enable row level security;

create policy "Users see their nodes" on public.repo_nodes for select 
using (exists (select 1 from public.repositories r where r.id = repo_id and r.user_id = auth.uid()));
