-- Enhanced SRS Health Metrics Migration
-- Phase 2.4: Ship SRS Health Metrics
-- 
-- This migration enhances the existing mv_srs_health materialized view with:
-- - Due/overdue counts and detailed timing metrics
-- - Lapse tracking and repetition counts
-- - Stability measurements per student
-- - Overload detection flags and thresholds
-- - Quick-action recommendation data
-- - School and class-level aggregations

-- Drop existing mv_srs_health view to recreate with enhanced metrics
DROP MATERIALIZED VIEW IF EXISTS mv_srs_health;

-- Enhanced SRS Health Metrics (Student Level)
CREATE MATERIALIZED VIEW mv_srs_health AS
SELECT
  u.id AS user_id,
  u.email,
  u.school_id,
  u.cefr_level,
  u.level,
  
  -- Vocabulary counts
  COUNT(DISTINCT uwr.id) AS total_vocabulary,
  COUNT(DISTINCT CASE 
    WHEN uwr.state >= 2 
    THEN uwr.id 
  END) AS vocab_mastered_count,
  COUNT(DISTINCT CASE 
    WHEN uwr.state = 1 
    THEN uwr.id 
  END) AS vocab_learning_count,
  COUNT(DISTINCT CASE 
    WHEN uwr.state = 0 
    THEN uwr.id 
  END) AS vocab_new_count,
  COUNT(DISTINCT CASE 
    WHEN uwr.due <= NOW() 
    THEN uwr.id 
  END) AS vocab_due_for_review,
  COUNT(DISTINCT CASE 
    WHEN uwr.due < NOW() - INTERVAL '1 day'
    THEN uwr.id 
  END) AS vocab_overdue_count,
  
  -- Sentence counts
  COUNT(DISTINCT usr.id) AS total_sentences,
  COUNT(DISTINCT CASE 
    WHEN usr.state >= 2 
    THEN usr.id 
  END) AS sentence_mastered_count,
  COUNT(DISTINCT CASE 
    WHEN usr.state = 1 
    THEN usr.id 
  END) AS sentence_learning_count,
  COUNT(DISTINCT CASE 
    WHEN usr.state = 0 
    THEN usr.id 
  END) AS sentence_new_count,
  COUNT(DISTINCT CASE 
    WHEN usr.due <= NOW() 
    THEN usr.id 
  END) AS sentence_due_for_review,
  COUNT(DISTINCT CASE 
    WHEN usr.due < NOW() - INTERVAL '1 day'
    THEN usr.id 
  END) AS sentence_overdue_count,
  
  -- Combined totals
  (COUNT(DISTINCT uwr.id) + COUNT(DISTINCT usr.id)) AS total_cards,
  (COUNT(DISTINCT CASE WHEN uwr.due <= NOW() THEN uwr.id END) + 
   COUNT(DISTINCT CASE WHEN usr.due <= NOW() THEN usr.id END)) AS total_due_for_review,
  (COUNT(DISTINCT CASE WHEN uwr.due < NOW() - INTERVAL '1 day' THEN uwr.id END) + 
   COUNT(DISTINCT CASE WHEN usr.due < NOW() - INTERVAL '1 day' THEN usr.id END)) AS total_overdue_count,
  
  -- Lapse and repetition metrics
  COALESCE(AVG(uwr.lapses), 0) + COALESCE(AVG(usr.lapses), 0) AS avg_lapses,
  COALESCE(AVG(uwr.reps), 0) + COALESCE(AVG(usr.reps), 0) AS avg_repetitions,
  COALESCE(MAX(uwr.lapses), 0) + COALESCE(MAX(usr.lapses), 0) AS max_lapses,
  COALESCE(MAX(uwr.reps), 0) + COALESCE(MAX(usr.reps), 0) AS max_repetitions,
  
  -- Stability metrics
  COALESCE(AVG(uwr.stability), 0) AS avg_vocab_stability,
  COALESCE(AVG(usr.stability), 0) AS avg_sentence_stability,
  (COALESCE(AVG(uwr.stability), 0) + COALESCE(AVG(usr.stability), 0)) / 2 AS overall_stability,
  
  -- Performance percentages
  ROUND(
    100.0 * (COUNT(DISTINCT CASE WHEN uwr.state >= 2 THEN uwr.id END) + 
             COUNT(DISTINCT CASE WHEN usr.state >= 2 THEN usr.id END)) / 
    NULLIF(COUNT(DISTINCT uwr.id) + COUNT(DISTINCT usr.id), 0),
    1
  ) AS overall_mastery_pct,
  
  -- Overload detection flags
  CASE 
    WHEN (COUNT(DISTINCT CASE WHEN uwr.due <= NOW() THEN uwr.id END) + 
          COUNT(DISTINCT CASE WHEN usr.due <= NOW() THEN usr.id END)) > 50 
    THEN true
    ELSE false
  END AS is_overloaded,
  
  CASE 
    WHEN (COUNT(DISTINCT CASE WHEN uwr.due < NOW() - INTERVAL '3 days' THEN uwr.id END) + 
          COUNT(DISTINCT CASE WHEN usr.due < NOW() - INTERVAL '3 days' THEN usr.id END)) > 20 
    THEN true
    ELSE false
  END AS has_critical_backlog,
  
  CASE 
    WHEN COALESCE(AVG(uwr.lapses), 0) + COALESCE(AVG(usr.lapses), 0) > 3 
    THEN true
    ELSE false
  END AS has_high_lapse_rate,
  
  -- Recommended daily sessions
  LEAST(GREATEST(
    CEIL((COUNT(DISTINCT CASE WHEN uwr.due <= NOW() THEN uwr.id END) + 
          COUNT(DISTINCT CASE WHEN usr.due <= NOW() THEN usr.id END)) / 20.0),
    1
  ), 5) AS recommended_daily_sessions,
  
  -- Recommended session duration (minutes)
  CASE 
    WHEN (COUNT(DISTINCT uwr.id) + COUNT(DISTINCT usr.id)) <= 10 THEN 10
    WHEN (COUNT(DISTINCT uwr.id) + COUNT(DISTINCT usr.id)) <= 50 THEN 15
    WHEN (COUNT(DISTINCT uwr.id) + COUNT(DISTINCT usr.id)) <= 100 THEN 20
    ELSE 25
  END AS recommended_session_minutes,
  
  -- Last activity timestamps
  GREATEST(
    COALESCE(MAX(uwr.updated_at), '1970-01-01'::timestamp),
    COALESCE(MAX(usr.updated_at), '1970-01-01'::timestamp)
  ) AS last_practice_at,
  
  -- Days since last practice
  EXTRACT(
    EPOCH FROM (NOW() - GREATEST(
      COALESCE(MAX(uwr.updated_at), '1970-01-01'::timestamp),
      COALESCE(MAX(usr.updated_at), '1970-01-01'::timestamp)
    ))
  ) / (24 * 3600) AS days_since_last_practice,
  
  -- Inactive flags
  CASE 
    WHEN EXTRACT(
      EPOCH FROM (NOW() - GREATEST(
        COALESCE(MAX(uwr.updated_at), '1970-01-01'::timestamp),
        COALESCE(MAX(usr.updated_at), '1970-01-01'::timestamp)
      ))
    ) / (24 * 3600) > 7
    THEN true
    ELSE false
  END AS is_inactive,
  
  NOW() AS last_updated

FROM users u
LEFT JOIN user_word_records uwr ON u.id = uwr.user_id 
  AND uwr.save_to_flashcard = true
LEFT JOIN user_sentence_records usr ON u.id = usr.user_id 
  AND usr.save_to_flashcard = true
WHERE u.role = 'STUDENT'
GROUP BY u.id, u.email, u.school_id, u.cefr_level, u.level;

-- Create indexes for optimal query performance
CREATE UNIQUE INDEX mv_srs_health_user_id_idx ON mv_srs_health(user_id);
CREATE INDEX mv_srs_health_school_id_idx ON mv_srs_health(school_id);
CREATE INDEX mv_srs_health_overload_idx ON mv_srs_health(is_overloaded, has_critical_backlog);
CREATE INDEX mv_srs_health_inactive_idx ON mv_srs_health(is_inactive);
CREATE INDEX mv_srs_health_due_review_idx ON mv_srs_health(total_due_for_review DESC);

-- SRS Health Metrics - Class Level Aggregation
CREATE MATERIALIZED VIEW mv_srs_health_class AS
SELECT
  c.id AS classroom_id,
  c.classroom_name,
  c.grade,
  c.school_id,
  
  -- Student counts
  COUNT(DISTINCT cs.student_id) AS total_students,
  COUNT(DISTINCT CASE WHEN h.is_overloaded THEN cs.student_id END) AS overloaded_students,
  COUNT(DISTINCT CASE WHEN h.has_critical_backlog THEN cs.student_id END) AS critical_backlog_students,
  COUNT(DISTINCT CASE WHEN h.is_inactive THEN cs.student_id END) AS inactive_students,
  COUNT(DISTINCT CASE WHEN h.total_cards > 0 THEN cs.student_id END) AS active_srs_students,
  
  -- Aggregated metrics
  COALESCE(AVG(h.total_cards), 0) AS avg_cards_per_student,
  COALESCE(AVG(h.total_due_for_review), 0) AS avg_due_per_student,
  COALESCE(AVG(h.total_overdue_count), 0) AS avg_overdue_per_student,
  COALESCE(AVG(h.overall_mastery_pct), 0) AS class_avg_mastery_pct,
  COALESCE(AVG(h.overall_stability), 0) AS class_avg_stability,
  
  -- Class-level flags
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN h.is_overloaded THEN cs.student_id END) / 
    NULLIF(COUNT(DISTINCT cs.student_id), 0),
    1
  ) AS overload_rate,
  
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN h.is_inactive THEN cs.student_id END) / 
    NULLIF(COUNT(DISTINCT cs.student_id), 0),
    1
  ) AS inactive_rate,
  
  -- Class health status
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN h.is_overloaded THEN cs.student_id END) > 
         (COUNT(DISTINCT cs.student_id) * 0.3) THEN 'at_risk'
    WHEN COUNT(DISTINCT CASE WHEN h.is_inactive THEN cs.student_id END) > 
         (COUNT(DISTINCT cs.student_id) * 0.5) THEN 'low_engagement'
    WHEN COALESCE(AVG(h.overall_mastery_pct), 0) < 30 THEN 'struggling'
    WHEN COALESCE(AVG(h.overall_mastery_pct), 0) > 80 THEN 'excelling'
    ELSE 'healthy'
  END AS class_health_status,
  
  -- Recommended actions count
  COUNT(DISTINCT CASE WHEN h.is_overloaded OR h.has_critical_backlog THEN cs.student_id END) AS students_needing_intervention,
  
  NOW() AS last_updated

FROM classrooms c
JOIN "classroomStudents" cs ON c.id = cs.classroom_id
LEFT JOIN mv_srs_health h ON cs.student_id = h.user_id
GROUP BY c.id, c.classroom_name, c.grade, c.school_id;

-- Create indexes for class-level view
CREATE UNIQUE INDEX mv_srs_health_class_classroom_id_idx ON mv_srs_health_class(classroom_id);
CREATE INDEX mv_srs_health_class_school_id_idx ON mv_srs_health_class(school_id);
CREATE INDEX mv_srs_health_class_status_idx ON mv_srs_health_class(class_health_status);

-- SRS Health Metrics - School Level Aggregation
CREATE MATERIALIZED VIEW mv_srs_health_school AS
SELECT
  s.id AS school_id,
  s.name AS school_name,
  
  -- Overall counts
  COUNT(DISTINCT h.user_id) AS total_students,
  COUNT(DISTINCT c.classroom_id) AS total_classes,
  COUNT(DISTINCT CASE WHEN h.is_overloaded THEN h.user_id END) AS overloaded_students,
  COUNT(DISTINCT CASE WHEN h.has_critical_backlog THEN h.user_id END) AS critical_backlog_students,
  COUNT(DISTINCT CASE WHEN h.is_inactive THEN h.user_id END) AS inactive_students,
  
  -- School-wide averages
  COALESCE(AVG(h.total_cards), 0) AS school_avg_cards_per_student,
  COALESCE(AVG(h.total_due_for_review), 0) AS school_avg_due_per_student,
  COALESCE(AVG(h.overall_mastery_pct), 0) AS school_avg_mastery_pct,
  COALESCE(AVG(h.overall_stability), 0) AS school_avg_stability,
  
  -- School-level health indicators
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN h.is_overloaded THEN h.user_id END) / 
    NULLIF(COUNT(DISTINCT h.user_id), 0),
    1
  ) AS school_overload_rate,
  
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN h.is_inactive THEN h.user_id END) / 
    NULLIF(COUNT(DISTINCT h.user_id), 0),
    1
  ) AS school_inactive_rate,
  
  -- Classes needing attention
  COUNT(DISTINCT CASE WHEN c.class_health_status = 'at_risk' THEN c.classroom_id END) AS at_risk_classes,
  COUNT(DISTINCT CASE WHEN c.class_health_status = 'low_engagement' THEN c.classroom_id END) AS low_engagement_classes,
  COUNT(DISTINCT CASE WHEN c.class_health_status = 'struggling' THEN c.classroom_id END) AS struggling_classes,
  
  -- School health status
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN h.is_overloaded THEN h.user_id END) > 
         (COUNT(DISTINCT h.user_id) * 0.4) THEN 'critical'
    WHEN COUNT(DISTINCT CASE WHEN h.is_inactive THEN h.user_id END) > 
         (COUNT(DISTINCT h.user_id) * 0.6) THEN 'disengaged'
    WHEN COALESCE(AVG(h.overall_mastery_pct), 0) < 25 THEN 'underperforming'
    WHEN COALESCE(AVG(h.overall_mastery_pct), 0) > 75 THEN 'high_performing'
    ELSE 'stable'
  END AS school_health_status,
  
  NOW() AS last_updated

FROM schools s
LEFT JOIN mv_srs_health h ON s.id = h.school_id
LEFT JOIN mv_srs_health_class c ON s.id = c.school_id
GROUP BY s.id, s.name;

-- Create indexes for school-level view
CREATE UNIQUE INDEX mv_srs_health_school_school_id_idx ON mv_srs_health_school(school_id);
CREATE INDEX mv_srs_health_school_status_idx ON mv_srs_health_school(school_health_status);

-- Function to refresh all SRS health materialized views
CREATE OR REPLACE FUNCTION refresh_srs_health_views() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_srs_health;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_srs_health_class;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_srs_health_school;
END;
$$ LANGUAGE plpgsql;

-- Comment documentation
COMMENT ON MATERIALIZED VIEW mv_srs_health IS 'Enhanced SRS health metrics per student with overload detection and action recommendations';
COMMENT ON MATERIALIZED VIEW mv_srs_health_class IS 'Class-level aggregation of SRS health metrics with intervention indicators';
COMMENT ON MATERIALIZED VIEW mv_srs_health_school IS 'School-level rollup of SRS health metrics for administrative oversight';
COMMENT ON FUNCTION refresh_srs_health_views() IS 'Convenience function to refresh all SRS health materialized views concurrently';