-- Rollback script for Enhanced CEFR vs RA Alignment Metrics

-- Drop the enhanced materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_alignment_metrics;

-- Remove the alignment override column from assignments
ALTER TABLE "assignments" DROP COLUMN IF EXISTS "alignment_override";

-- Recreate the original mv_cefr_ra_alignment view (simplified version)
CREATE MATERIALIZED VIEW mv_cefr_ra_alignment AS
SELECT
  u.school_id,
  u.level AS ra_level,
  u.cefr_level,
  rcm.cefr_level AS mapped_cefr_level,
  COUNT(DISTINCT u.id) AS student_count,
  AVG(
    CASE 
      WHEN lr.created_at >= NOW() - INTERVAL '30 days' 
      THEN (
        (lr.phase1::json->>'elapsedTime')::int + 
        (lr.phase2::json->>'elapsedTime')::int + 
        (lr.phase3::json->>'elapsedTime')::int + 
        (lr.phase4::json->>'elapsedTime')::int + 
        (lr.phase5::json->>'elapsedTime')::int + 
        (lr.phase6::json->>'elapsedTime')::int + 
        (lr.phase7::json->>'elapsedTime')::int + 
        (lr.phase8::json->>'elapsedTime')::int + 
        (lr.phase9::json->>'elapsedTime')::int + 
        (lr.phase10::json->>'elapsedTime')::int + 
        (lr.phase11::json->>'elapsedTime')::int + 
        (lr.phase12::json->>'elapsedTime')::int + 
        (lr.phase13::json->>'elapsedTime')::int + 
        (lr.phase14::json->>'elapsedTime')::int
      ) / 1000.0 / 60.0
    END
  ) AS avg_monthly_reading_minutes,
  COUNT(DISTINCT CASE 
    WHEN lr.created_at >= NOW() - INTERVAL '30 days' 
    THEN lr.id 
  END) AS articles_last_30d
FROM users u
LEFT JOIN ra_cefr_mappings rcm ON u.level = rcm.ra_level
LEFT JOIN lesson_records lr ON u.id = lr.user_id
WHERE u.role = 'STUDENT'
GROUP BY u.school_id, u.level, u.cefr_level, rcm.cefr_level;

CREATE INDEX mv_cefr_ra_alignment_school_id_idx ON mv_cefr_ra_alignment(school_id);
CREATE INDEX mv_cefr_ra_alignment_levels_idx ON mv_cefr_ra_alignment(ra_level, cefr_level);