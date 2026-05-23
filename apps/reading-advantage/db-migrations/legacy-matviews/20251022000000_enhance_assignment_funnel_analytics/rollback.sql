-- Rollback for Enhanced Assignment Funnel Analytics
-- Reverts Phase 2.2 changes and restores original assignment funnel view

-- Drop enhanced views
DROP MATERIALIZED VIEW IF EXISTS mv_school_assignment_funnel CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_class_assignment_funnel CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_assignment_funnel CASCADE;

-- Restore original assignment funnel view (from 20251009000001 migration)
CREATE MATERIALIZED VIEW mv_assignment_funnel AS
SELECT
  a.id AS assignment_id,
  a.classroom_id,
  c.school_id,
  a.article_id,
  a."createdAt" AS assigned_at,
  COUNT(sa.id) AS total_students,
  COUNT(CASE WHEN sa.status = 'IN_PROGRESS' OR sa.status = 'COMPLETED' THEN sa.id END) AS started_count,
  COUNT(CASE WHEN sa.status = 'COMPLETED' THEN sa.id END) AS completed_count,
  ROUND(
    COUNT(CASE WHEN sa.status = 'IN_PROGRESS' OR sa.status = 'COMPLETED' THEN sa.id END)::numeric / 
    NULLIF(COUNT(sa.id), 0) * 100, 
    1
  ) AS started_pct,
  ROUND(
    COUNT(CASE WHEN sa.status = 'COMPLETED' THEN sa.id END)::numeric / 
    NULLIF(COUNT(sa.id), 0) * 100, 
    1
  ) AS completed_pct,
  AVG(CASE 
    WHEN sa.status = 'COMPLETED' AND sa.completed_at IS NOT NULL AND sa.started_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (sa.completed_at - sa.started_at)) / 3600 
  END) AS avg_completion_hours
FROM assignments a
JOIN classrooms c ON a.classroom_id = c.id
LEFT JOIN student_assignments sa ON a.id = sa.assignment_id
GROUP BY a.id, a.classroom_id, c.school_id, a.article_id, a."createdAt";

-- Restore original indexes
CREATE UNIQUE INDEX mv_assignment_funnel_assignment_id_idx ON mv_assignment_funnel(assignment_id);
CREATE INDEX mv_assignment_funnel_classroom_id_idx ON mv_assignment_funnel(classroom_id);
CREATE INDEX mv_assignment_funnel_school_id_idx ON mv_assignment_funnel(school_id);