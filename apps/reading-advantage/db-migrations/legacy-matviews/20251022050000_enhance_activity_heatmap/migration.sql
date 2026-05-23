-- Enhanced Activity Heatmap for Phase 2.5
-- Replaces existing mv_activity_heatmap with more comprehensive activity tracking

-- Drop existing basic heatmap
DROP MATERIALIZED VIEW IF EXISTS mv_activity_heatmap;

-- Create enhanced activity heatmap with improved timezone handling and activity type breakdown
CREATE MATERIALIZED VIEW mv_activity_heatmap AS
WITH activity_union AS (
  -- Reading activities from lesson records
  SELECT 
    lr.user_id,
    u.school_id,
    lr.created_at,
    'READING' as activity_type,
    lr.article_id as target_id,
    CASE 
      WHEN (lr.phase14::json->>'status')::int = 2 THEN true 
      ELSE false 
    END as completed,
    (
      COALESCE((lr.phase1::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase2::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase3::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase4::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase5::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase6::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase7::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase8::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase9::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase10::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase11::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase12::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase13::json->>'elapsedTime')::int, 0) + 
      COALESCE((lr.phase14::json->>'elapsedTime')::int, 0)
    ) / 1000 as duration_seconds
  FROM lesson_records lr
  JOIN users u ON lr.user_id = u.id
  WHERE u.role = 'STUDENT' 
    AND lr.created_at >= NOW() - INTERVAL '6 months'
    
  UNION ALL
  
  -- User activities (questions, flashcards, etc.)
  SELECT 
    ua.user_id,
    u.school_id,
    ua."createdAt" as created_at,
    CASE 
      WHEN ua.activity_type IN ('ARTICLE_READ', 'STORIES_READ', 'CHAPTER_READ') THEN 'READING'
      WHEN ua.activity_type IN ('MC_QUESTION', 'SA_QUESTION', 'LA_QUESTION') THEN 'QUESTIONS'
      WHEN ua.activity_type IN ('SENTENCE_FLASHCARDS', 'VOCABULARY_FLASHCARDS', 'LESSON_FLASHCARD', 'LESSON_SENTENCE_FLASHCARDS') THEN 'FLASHCARDS'
      WHEN ua.activity_type IN ('SENTENCE_MATCHING', 'SENTENCE_ORDERING', 'SENTENCE_WORD_ORDERING', 'SENTENCE_CLOZE_TEST', 'VOCABULARY_MATCHING') THEN 'PRACTICE'
      WHEN ua.activity_type = 'LEVEL_TEST' THEN 'ASSESSMENT'
      WHEN ua.activity_type IN ('ARTICLE_RATING', 'STORIES_RATING', 'CHAPTER_RATING') THEN 'RATING'
      ELSE 'OTHER'
    END as activity_type,
    ua.target_id,
    ua.completed,
    COALESCE(ua.timer, 0) / 1000 as duration_seconds
  FROM "UserActivity" ua
  JOIN users u ON ua.user_id = u.id
  WHERE u.role = 'STUDENT'
    AND ua."createdAt" >= NOW() - INTERVAL '6 months'
),
school_timezones AS (
  -- All schools use UTC timezone
  SELECT DISTINCT
    s.id as school_id,
    'UTC' as timezone
  FROM schools s
  
  UNION ALL
  
  -- Include NULL school_id case (students without schools)
  SELECT 
    NULL as school_id,
    'UTC' as timezone
)
SELECT 
  -- Entity identifiers
  au.user_id,
  au.school_id,
  u.email,
  u.name as display_name,
  
  -- Time buckets in school timezone
  DATE(au.created_at AT TIME ZONE 'UTC' AT TIME ZONE st.timezone) as activity_date,
  EXTRACT(HOUR FROM (au.created_at AT TIME ZONE 'UTC' AT TIME ZONE st.timezone))::integer as hour_of_day,
  EXTRACT(DOW FROM (au.created_at AT TIME ZONE 'UTC' AT TIME ZONE st.timezone))::integer as day_of_week,
  
  -- Activity type and metrics
  au.activity_type,
  COUNT(*) as activity_count,
  COUNT(CASE WHEN au.completed = true THEN 1 END) as completed_count,
  SUM(au.duration_seconds) as total_duration_seconds,
  AVG(au.duration_seconds) as avg_duration_seconds,
  
  -- Aggregation metadata
  st.timezone,
  COUNT(DISTINCT au.target_id) as unique_targets,
  MIN(au.created_at) as first_activity_at,
  MAX(au.created_at) as last_activity_at
  
FROM activity_union au
JOIN users u ON au.user_id = u.id
LEFT JOIN school_timezones st ON au.school_id = st.school_id
GROUP BY 
  au.user_id, 
  au.school_id, 
  u.email, 
  u.name,
  DATE(au.created_at AT TIME ZONE 'UTC' AT TIME ZONE st.timezone),
  EXTRACT(HOUR FROM (au.created_at AT TIME ZONE 'UTC' AT TIME ZONE st.timezone)),
  EXTRACT(DOW FROM (au.created_at AT TIME ZONE 'UTC' AT TIME ZONE st.timezone)),
  au.activity_type,
  st.timezone;

-- Indexes for efficient querying
-- UNIQUE index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX mv_activity_heatmap_unique_idx ON mv_activity_heatmap(user_id, activity_date, hour_of_day, activity_type);

CREATE INDEX mv_activity_heatmap_user_id_idx ON mv_activity_heatmap(user_id);
CREATE INDEX mv_activity_heatmap_school_id_idx ON mv_activity_heatmap(school_id);
CREATE INDEX mv_activity_heatmap_date_idx ON mv_activity_heatmap(activity_date);
CREATE INDEX mv_activity_heatmap_hour_idx ON mv_activity_heatmap(hour_of_day);
CREATE INDEX mv_activity_heatmap_dow_idx ON mv_activity_heatmap(day_of_week);
CREATE INDEX mv_activity_heatmap_activity_type_idx ON mv_activity_heatmap(activity_type);
CREATE INDEX mv_activity_heatmap_school_date_idx ON mv_activity_heatmap(school_id, activity_date);

-- Create aggregated class-level view for performance
CREATE MATERIALIZED VIEW mv_class_activity_heatmap AS
SELECT 
  cs.classroom_id,
  c.school_id,
  ah.activity_date,
  ah.hour_of_day,
  ah.day_of_week,
  ah.activity_type,
  ah.timezone,
  COUNT(DISTINCT ah.user_id) as unique_students,
  SUM(ah.activity_count) as total_activities,
  SUM(ah.completed_count) as total_completed,
  SUM(ah.total_duration_seconds) as total_duration_seconds,
  AVG(ah.avg_duration_seconds) as avg_duration_seconds,
  SUM(ah.unique_targets) as total_unique_targets,
  MIN(ah.first_activity_at) as first_activity_at,
  MAX(ah.last_activity_at) as last_activity_at
FROM mv_activity_heatmap ah
JOIN "classroomStudents" cs ON ah.user_id = cs.student_id
JOIN classrooms c ON cs.classroom_id = c.id
GROUP BY 
  cs.classroom_id,
  c.school_id,
  ah.activity_date,
  ah.hour_of_day,
  ah.day_of_week,
  ah.activity_type,
  ah.timezone;

-- Indexes for class heatmap
CREATE INDEX mv_class_activity_heatmap_classroom_id_idx ON mv_class_activity_heatmap(classroom_id);
CREATE INDEX mv_class_activity_heatmap_school_id_idx ON mv_class_activity_heatmap(school_id);
CREATE INDEX mv_class_activity_heatmap_date_idx ON mv_class_activity_heatmap(activity_date);
CREATE INDEX mv_class_activity_heatmap_composite_idx ON mv_class_activity_heatmap(classroom_id, activity_date, hour_of_day);

-- Function to refresh activity heatmap materialized views
CREATE OR REPLACE FUNCTION refresh_activity_heatmap_matviews()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh in dependency order
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_activity_heatmap;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_activity_heatmap;
  
  -- Emit notification for cache invalidation
  PERFORM pg_notify('metrics:update', json_build_object(
    'views', ARRAY['mv_activity_heatmap', 'mv_class_activity_heatmap'],
    'timestamp', extract(epoch from now()),
    'source', 'refresh_activity_heatmap_matviews'
  )::text);
END;
$$;

-- Add to existing refresh all function if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_all_matviews') THEN
    DROP FUNCTION refresh_all_matviews();
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION refresh_all_matviews()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh velocity views
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_velocity;
  
  -- Refresh assignment views
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_assignment_funnel;
  
  -- Refresh SRS views
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_srs_health;
  
  -- Refresh genre views
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_genre_engagement;
  
  -- Refresh alignment views
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cefr_ra_alignment;
  
  -- Refresh daily rollups
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_activity_rollups;
  
  -- Refresh activity heatmap views
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_activity_heatmap;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_activity_heatmap;
  
  -- Emit notification
  PERFORM pg_notify('metrics:update', json_build_object(
    'views', ARRAY[
      'mv_student_velocity',
      'mv_assignment_funnel', 
      'mv_srs_health',
      'mv_genre_engagement',
      'mv_cefr_ra_alignment',
      'mv_daily_activity_rollups',
      'mv_activity_heatmap',
      'mv_class_activity_heatmap'
    ],
    'timestamp', extract(epoch from now()),
    'source', 'refresh_all_matviews'
  )::text);
END;
$$;