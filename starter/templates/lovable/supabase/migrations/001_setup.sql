-- Supabase Migration: CodeGuard Logs Setup
-- Run this to enable logging for analytics

-- Create logs table
CREATE TABLE IF NOT EXISTS codeguard_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  frameworks TEXT[] DEFAULT '{}',
  violations_found INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  scan_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE codeguard_logs ENABLE ROW LEVEL SECURITY;

-- Allow Edge Functions to insert logs
CREATE POLICY "Allow service role insert" ON codeguard_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- Allow authenticated users to read their logs
CREATE POLICY "Allow authenticated read" ON codeguard_logs
  FOR SELECT TO authenticated USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_codeguard_logs_created_at 
  ON codeguard_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_codeguard_logs_filename 
  ON codeguard_logs(filename);

-- Optional: Function to get scan statistics
CREATE OR REPLACE FUNCTION get_scan_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_scans BIGINT,
  total_violations BIGINT,
  total_credits BIGINT,
  avg_violations NUMERIC,
  top_files JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_scans,
    SUM(violations_found)::BIGINT AS total_violations,
    SUM(credits_used)::BIGINT AS total_credits,
    ROUND(AVG(violations_found), 2) AS avg_violations,
    (
      SELECT JSON_AGG(row_to_json(t))
      FROM (
        SELECT filename, COUNT(*) as scan_count
        FROM codeguard_logs
        WHERE created_at > NOW() - (days_back || ' days')::INTERVAL
        GROUP BY filename
        ORDER BY scan_count DESC
        LIMIT 5
      ) t
    ) AS top_files
  FROM codeguard_logs
  WHERE created_at > NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
