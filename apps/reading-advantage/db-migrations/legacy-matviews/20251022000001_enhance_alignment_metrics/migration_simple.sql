-- Simple enhanced alignment metrics migration (minimal version for testing)

-- Add alignment_override column to assignments table
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "alignment_override" JSONB;

-- Drop the existing mv_cefr_ra_alignment view to recreate with enhancements
DROP MATERIALIZED VIEW IF EXISTS mv_cefr_ra_alignment;
DROP MATERIALIZED VIEW IF EXISTS mv_alignment_metrics;

-- Create a basic enhanced alignment metrics view first
CREATE MATERIALIZED VIEW mv_alignment_metrics AS
SELECT
  'system' AS scope_id,
  'system' AS scope_type,
  NULL::text AS user_id,
  NULL::text AS display_name,
  NULL::text AS email,
  NULL::text AS classroom_id,
  NULL::int AS student_ra_level,
  NULL::text AS student_cefr_level,
  NULL::text AS mapped_student_cefr_level,
  0 AS total_readings,
  0 AS below_count,
  0 AS aligned_count,
  0 AS above_count,
  0 AS unknown_count,
  0.0 AS below_pct,
  0.0 AS aligned_pct,
  0.0 AS above_pct,
  0.0 AS unknown_pct,
  NULL::jsonb AS below_samples,
  NULL::jsonb AS aligned_samples,
  NULL::jsonb AS above_samples,
  NULL::timestamp AS first_reading_at,
  NULL::timestamp AS last_reading_at,
  0 AS unique_articles,
  0 AS assigned_articles;

-- Create basic indexes
CREATE UNIQUE INDEX mv_alignment_metrics_unique_idx ON mv_alignment_metrics(scope_id, scope_type);

COMMENT ON MATERIALIZED VIEW mv_alignment_metrics IS 
'Enhanced alignment metrics - basic implementation for Phase 2.3';