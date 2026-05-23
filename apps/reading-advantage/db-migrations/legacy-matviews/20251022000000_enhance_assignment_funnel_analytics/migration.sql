-- Enhanced Assignment Funnel Analytics Migration
-- Phase 2.2: Assignment Funnel Analytics with Predictive Completion Timelines

-- Drop existing assignment funnel view to rebuild with enhancements
DROP MATERIALIZED VIEW IF EXISTS mv_assignment_funnel CASCADE;

-- Enhanced Assignment Funnel Metrics with Prediction Capabilities
CREATE MATERIALIZED VIEW mv_assignment_funnel AS
WITH assignment_base AS (
  SELECT
    a.id AS assignment_id,
    a.classroom_id,
    c.school_id,
    c.classroom_name,
    c.grade,
    a.article_id,
    a.title AS assignment_title,
    a.due_date,
    a."createdAt" AS assigned_at,
    COUNT(sa.id) AS total_students,
    
    -- Funnel counts
    COUNT(CASE WHEN sa.status = 'NOT_STARTED' THEN 1 END) AS not_started_count,
    COUNT(CASE WHEN sa.status = 'IN_PROGRESS' THEN 1 END) AS in_progress_count,
    COUNT(CASE WHEN sa.status = 'COMPLETED' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN sa.status IN ('IN_PROGRESS', 'COMPLETED') THEN 1 END) AS started_count,
    
    -- Overdue analysis (for assignments with due dates)
    COUNT(CASE 
      WHEN a.due_date IS NOT NULL 
       AND a.due_date < NOW() 
       AND sa.status != 'COMPLETED' 
      THEN 1 
    END) AS overdue_count,
    
    -- Completion time metrics (in hours)
    PERCENTILE_CONT(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (sa.completed_at - sa.started_at)) / 3600
    ) FILTER (
      WHERE sa.status = 'COMPLETED' 
        AND sa.started_at IS NOT NULL 
        AND sa.completed_at IS NOT NULL
    ) AS median_completion_hours,
    
    -- P80 completion time for forecasting
    PERCENTILE_CONT(0.8) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (sa.completed_at - sa.started_at)) / 3600
    ) FILTER (
      WHERE sa.status = 'COMPLETED' 
        AND sa.started_at IS NOT NULL 
        AND sa.completed_at IS NOT NULL
    ) AS p80_completion_hours,
    
    -- Average score for completed assignments
    AVG(sa.score) FILTER (WHERE sa.status = 'COMPLETED' AND sa.score IS NOT NULL) AS avg_score,
    
    -- Assignment age in days
    EXTRACT(EPOCH FROM (NOW() - a."createdAt")) / (24 * 3600) AS assignment_age_days
    
  FROM assignments a
  JOIN classrooms c ON a.classroom_id = c.id
  LEFT JOIN student_assignments sa ON a.id = sa.assignment_id
  GROUP BY a.id, a.classroom_id, c.school_id, c.classroom_name, c.grade, 
           a.article_id, a.title, a.due_date, a."createdAt"
),
class_velocity AS (
  -- Get class velocity data for prediction
  SELECT 
    classroom_id,
    xp_per_day_30d,
    engagement_rate_30d,
    is_low_signal
  FROM mv_class_velocity
),
assignment_with_velocity AS (
  SELECT 
    ab.*,
    COALESCE(cv.xp_per_day_30d, 0) AS class_velocity,
    COALESCE(cv.engagement_rate_30d, 0) AS class_engagement,
    COALESCE(cv.is_low_signal, true) AS class_low_signal
  FROM assignment_base ab
  LEFT JOIN class_velocity cv ON ab.classroom_id = cv.classroom_id
)
SELECT
  -- Assignment identification
  assignment_id,
  classroom_id,
  school_id,
  classroom_name,
  grade,
  article_id,
  assignment_title,
  due_date,
  assigned_at,
  
  -- Funnel metrics
  total_students,
  not_started_count,
  in_progress_count,
  completed_count,
  started_count,
  overdue_count,
  
  -- Percentages
  CASE WHEN total_students > 0 THEN ROUND((started_count::numeric / total_students * 100)::numeric, 1) ELSE 0 END AS started_pct,
  CASE WHEN total_students > 0 THEN ROUND((completed_count::numeric / total_students * 100)::numeric, 1) ELSE 0 END AS completed_pct,
  CASE WHEN total_students > 0 THEN ROUND((overdue_count::numeric / total_students * 100)::numeric, 1) ELSE 0 END AS overdue_pct,
  
  -- Completion metrics
  median_completion_hours,
  p80_completion_hours,
  avg_score,
  assignment_age_days,
  
  -- Class context for predictions
  class_velocity,
  class_engagement,
  class_low_signal,
  
  -- Predictive completion ETA (in days from now)
  CASE 
    WHEN class_low_signal OR completed_count < 3 THEN NULL -- Insufficient data
    WHEN p80_completion_hours IS NOT NULL AND p80_completion_hours > 0 THEN 
      ROUND((p80_completion_hours / 24.0)::numeric, 1) -- Convert hours to days
    WHEN median_completion_hours IS NOT NULL AND median_completion_hours > 0 THEN 
      ROUND((median_completion_hours * 1.3 / 24.0)::numeric, 1) -- Use median * 1.3 as fallback
    ELSE NULL
  END AS eta_80pct_days,
  
  -- At-risk indicators
  CASE 
    WHEN due_date IS NOT NULL AND due_date < NOW() + INTERVAL '2 days' 
     AND completed_count < (total_students * 0.5) THEN true
    WHEN assignment_age_days > 7 
     AND completed_count < (total_students * 0.3) THEN true
    ELSE false
  END AS is_at_risk,
  
  -- Last updated timestamp
  NOW() AS last_updated

FROM assignment_with_velocity;

-- Indexes for efficient querying
CREATE UNIQUE INDEX mv_assignment_funnel_v2_assignment_id_idx ON mv_assignment_funnel(assignment_id);
CREATE INDEX mv_assignment_funnel_v2_classroom_id_idx ON mv_assignment_funnel(classroom_id);
CREATE INDEX mv_assignment_funnel_v2_school_id_idx ON mv_assignment_funnel(school_id);
CREATE INDEX mv_assignment_funnel_v2_at_risk_idx ON mv_assignment_funnel(is_at_risk);
CREATE INDEX mv_assignment_funnel_v2_due_date_idx ON mv_assignment_funnel(due_date);

-- Class-level Assignment Funnel Rollups
CREATE MATERIALIZED VIEW mv_class_assignment_funnel AS
SELECT
  classroom_id,
  school_id,
  classroom_name,
  grade,
  
  -- Assignment counts
  COUNT(*) AS total_assignments,
  COUNT(CASE WHEN completed_pct >= 80 THEN 1 END) AS high_completion_assignments,
  COUNT(CASE WHEN is_at_risk THEN 1 END) AS at_risk_assignments,
  
  -- Student engagement
  SUM(total_students) AS total_student_assignments,
  SUM(completed_count) AS total_completions,
  SUM(overdue_count) AS total_overdue,
  
  -- Completion rates
  CASE 
    WHEN SUM(total_students) > 0 THEN 
      ROUND((SUM(completed_count)::numeric / SUM(total_students) * 100)::numeric, 1)
    ELSE 0 
  END AS overall_completion_rate,
  
  -- Timing metrics
  AVG(median_completion_hours) FILTER (WHERE median_completion_hours IS NOT NULL) AS avg_median_completion_hours,
  AVG(eta_80pct_days) FILTER (WHERE eta_80pct_days IS NOT NULL) AS avg_eta_days,
  
  -- Performance metrics
  AVG(avg_score) FILTER (WHERE avg_score IS NOT NULL) AS class_avg_score,
  
  -- Context
  AVG(class_velocity) AS class_velocity,
  AVG(class_engagement) AS class_engagement,
  BOOL_OR(class_low_signal) AS class_low_signal,
  
  -- Flags
  COUNT(CASE WHEN assignment_age_days > 14 AND completed_pct < 50 THEN 1 END) AS stale_assignments,
  
  MAX(last_updated) AS last_updated

FROM mv_assignment_funnel
GROUP BY classroom_id, school_id, classroom_name, grade;

-- Indexes for class rollups
CREATE UNIQUE INDEX mv_class_assignment_funnel_classroom_id_idx ON mv_class_assignment_funnel(classroom_id);
CREATE INDEX mv_class_assignment_funnel_school_id_idx ON mv_class_assignment_funnel(school_id);
CREATE INDEX mv_class_assignment_funnel_at_risk_idx ON mv_class_assignment_funnel(at_risk_assignments);

-- School-level Assignment Funnel Rollups
CREATE MATERIALIZED VIEW mv_school_assignment_funnel AS
SELECT
  school_id,
  
  -- Assignment counts across all classes
  COUNT(DISTINCT classroom_id) AS total_classes,
  COUNT(*) AS total_assignments,
  COUNT(CASE WHEN completed_pct >= 80 THEN 1 END) AS high_completion_assignments,
  COUNT(CASE WHEN is_at_risk THEN 1 END) AS at_risk_assignments,
  
  -- Student engagement across school
  SUM(total_students) AS total_student_assignments,
  SUM(completed_count) AS total_completions,
  SUM(overdue_count) AS total_overdue,
  
  -- School-wide completion rate
  CASE 
    WHEN SUM(total_students) > 0 THEN 
      ROUND((SUM(completed_count)::numeric / SUM(total_students) * 100)::numeric, 1)
    ELSE 0 
  END AS school_completion_rate,
  
  -- Timing metrics
  AVG(median_completion_hours) FILTER (WHERE median_completion_hours IS NOT NULL) AS school_avg_completion_hours,
  PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY eta_80pct_days) FILTER (WHERE eta_80pct_days IS NOT NULL) AS school_p80_eta_days,
  
  -- Performance
  AVG(avg_score) FILTER (WHERE avg_score IS NOT NULL) AS school_avg_score,
  
  -- Quality indicators
  COUNT(CASE WHEN assignment_age_days > 14 AND completed_pct < 50 THEN 1 END) AS stale_assignments,
  
  -- Classes with issues
  COUNT(DISTINCT CASE WHEN is_at_risk THEN classroom_id END) AS classes_with_at_risk_assignments,
  
  MAX(last_updated) AS last_updated

FROM mv_assignment_funnel
GROUP BY school_id;

-- Indexes for school rollups
CREATE UNIQUE INDEX mv_school_assignment_funnel_school_id_idx ON mv_school_assignment_funnel(school_id);
CREATE INDEX mv_school_assignment_funnel_at_risk_idx ON mv_school_assignment_funnel(at_risk_assignments);