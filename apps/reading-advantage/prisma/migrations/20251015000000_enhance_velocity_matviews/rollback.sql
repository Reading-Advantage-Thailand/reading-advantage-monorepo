-- Rollback for Enhanced Velocity Matviews
-- Use this to rollback the Phase 2.1 migration if needed

-- Drop new materialized views
DROP MATERIALIZED VIEW IF EXISTS mv_school_velocity CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_class_velocity CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_student_velocity CASCADE;

-- Recreate original simple student velocity view (from 20251009000001 migration)
CREATE MATERIALIZED VIEW mv_student_velocity AS
SELECT 
  u.id AS user_id,
  u.email,
  u.name AS display_name,
  u.school_id,
  -- Last 7 days
  COUNT(DISTINCT CASE 
    WHEN lr.created_at >= NOW() - INTERVAL '7 days' 
    THEN lr.id 
  END) AS articles_last_7d,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN lr.created_at >= NOW() - INTERVAL '7 days' 
      THEN lr.id 
    END)::numeric / 7, 
    2
  ) AS avg_per_day_7d,
  -- Last 30 days
  COUNT(DISTINCT CASE 
    WHEN lr.created_at >= NOW() - INTERVAL '30 days' 
    THEN lr.id 
  END) AS articles_last_30d,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN lr.created_at >= NOW() - INTERVAL '30 days' 
      THEN lr.id 
    END)::numeric / 30, 
    2
  ) AS avg_per_day_30d,
  -- All time
  COUNT(DISTINCT lr.id) AS articles_all_time,
  MAX(lr.created_at) AS last_activity_at
FROM users u
LEFT JOIN lesson_records lr ON u.id = lr.user_id
WHERE u.role = 'STUDENT'
GROUP BY u.id, u.email, u.name, u.school_id;

CREATE UNIQUE INDEX mv_student_velocity_user_id_idx ON mv_student_velocity(user_id);
CREATE INDEX mv_student_velocity_school_id_idx ON mv_student_velocity(school_id);

-- Note: You'll need to update the velocity service and controller to use the old schema
-- or temporarily disable velocity features after rollback.
