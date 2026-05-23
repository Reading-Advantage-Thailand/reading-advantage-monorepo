-- CreateMaterializedView: Student Velocity Metrics
-- Tracks reading velocity (articles/day) per student over time windows
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

-- CreateMaterializedView: Assignment Funnel Metrics
-- Tracks progression through assigned articles (assigned -> started -> completed)
CREATE MATERIALIZED VIEW mv_assignment_funnel AS
SELECT
  a.id AS assignment_id,
  a.classroom_id,
  c.school_id,
  a.article_id,
  a."createdAt" AS assigned_at,
  COUNT(DISTINCT sa.student_id) AS total_students,
  COUNT(DISTINCT CASE 
    WHEN sa.status IN ('IN_PROGRESS', 'COMPLETED') 
    THEN sa.student_id 
  END) AS started_count,
  COUNT(DISTINCT CASE 
    WHEN sa.status = 'COMPLETED' 
    THEN sa.student_id 
  END) AS completed_count,
  ROUND(
    100.0 * COUNT(DISTINCT CASE 
      WHEN sa.status IN ('IN_PROGRESS', 'COMPLETED') 
      THEN sa.student_id 
    END) / NULLIF(COUNT(DISTINCT sa.student_id), 0),
    1
  ) AS started_pct,
  ROUND(
    100.0 * COUNT(DISTINCT CASE 
      WHEN sa.status = 'COMPLETED' 
      THEN sa.student_id 
    END) / NULLIF(COUNT(DISTINCT sa.student_id), 0),
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

CREATE UNIQUE INDEX mv_assignment_funnel_assignment_id_idx ON mv_assignment_funnel(assignment_id);
CREATE INDEX mv_assignment_funnel_classroom_id_idx ON mv_assignment_funnel(classroom_id);
CREATE INDEX mv_assignment_funnel_school_id_idx ON mv_assignment_funnel(school_id);

-- CreateMaterializedView: SRS Health Metrics
-- Tracks spaced repetition system health per student (using UserSentenceRecord)
CREATE MATERIALIZED VIEW mv_srs_health AS
SELECT
  u.id AS user_id,
  u.email,
  u.school_id,
  COUNT(DISTINCT usr.id) AS total_sentences,
  COUNT(DISTINCT CASE 
    WHEN usr.state >= 2 
    THEN usr.id 
  END) AS mastered_count,
  COUNT(DISTINCT CASE 
    WHEN usr.state = 1 
    THEN usr.id 
  END) AS learning_count,
  COUNT(DISTINCT CASE 
    WHEN usr.state = 0 
    THEN usr.id 
  END) AS new_count,
  COUNT(DISTINCT CASE 
    WHEN usr.due <= NOW() 
    THEN usr.id 
  END) AS due_for_review,
  ROUND(
    100.0 * COUNT(DISTINCT CASE 
      WHEN usr.state >= 2 
      THEN usr.id 
    END) / NULLIF(COUNT(DISTINCT usr.id), 0),
    1
  ) AS mastery_pct,
  AVG(usr.state) AS avg_srs_level,
  MAX(usr.updated_at) AS last_practice_at
FROM users u
LEFT JOIN user_sentence_records usr ON u.id = usr.user_id
WHERE u.role = 'STUDENT'
GROUP BY u.id, u.email, u.school_id;

CREATE UNIQUE INDEX mv_srs_health_user_id_idx ON mv_srs_health(user_id);
CREATE INDEX mv_srs_health_school_id_idx ON mv_srs_health(school_id);

-- CreateMaterializedView: Genre Engagement Patterns
-- Tracks which genres students engage with and completion rates per genre
CREATE MATERIALIZED VIEW mv_genre_engagement AS
SELECT
  u.id AS user_id,
  u.school_id,
  a.genre,
  COUNT(DISTINCT lr.id) AS total_reads,
  COUNT(DISTINCT CASE 
    WHEN (lr.phase14::json->>'status')::int = 2 
    THEN lr.id 
  END) AS completed_reads,
  ROUND(
    100.0 * COUNT(DISTINCT CASE 
      WHEN (lr.phase14::json->>'status')::int = 2 
      THEN lr.id 
    END) / NULLIF(COUNT(DISTINCT lr.id), 0),
    1
  ) AS completion_rate,
  -- Calculate total time from all phases
  AVG(
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
  ) / 1000.0 / 60.0 AS avg_time_minutes,
  SUM(
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
  ) / 1000.0 / 60.0 AS total_time_minutes,
  MAX(lr.created_at) AS last_read_at
FROM users u
JOIN lesson_records lr ON u.id = lr.user_id
JOIN article a ON lr.article_id = a.id
WHERE u.role = 'STUDENT' AND a.genre IS NOT NULL
GROUP BY u.id, u.school_id, a.genre;

CREATE INDEX mv_genre_engagement_user_id_idx ON mv_genre_engagement(user_id);
CREATE INDEX mv_genre_engagement_school_id_idx ON mv_genre_engagement(school_id);
CREATE INDEX mv_genre_engagement_genre_idx ON mv_genre_engagement(genre);

-- CreateMaterializedView: Activity Heatmap
-- Shows when students are most active (hour of day, day of week)
CREATE MATERIALIZED VIEW mv_activity_heatmap AS
SELECT
  u.school_id,
  EXTRACT(DOW FROM lr.created_at)::integer AS day_of_week, -- 0=Sunday, 6=Saturday
  EXTRACT(HOUR FROM lr.created_at)::integer AS hour_of_day, -- 0-23
  COUNT(DISTINCT lr.id) AS activity_count,
  COUNT(DISTINCT lr.user_id) AS unique_students,
  AVG(
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
  ) / 1000.0 / 60.0 AS avg_time_minutes
FROM lesson_records lr
JOIN users u ON lr.user_id = u.id
WHERE u.role = 'STUDENT' 
  AND lr.created_at >= NOW() - INTERVAL '90 days'
GROUP BY u.school_id, day_of_week, hour_of_day;

CREATE INDEX mv_activity_heatmap_school_id_idx ON mv_activity_heatmap(school_id);
CREATE INDEX mv_activity_heatmap_time_idx ON mv_activity_heatmap(day_of_week, hour_of_day);

-- CreateMaterializedView: CEFR-RA Alignment Analysis
-- Shows distribution of student RA levels vs CEFR levels
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

-- CreateMaterializedView: Daily Activity Rollups
-- Pre-aggregated daily activity stats for faster dashboard loading
CREATE MATERIALIZED VIEW mv_daily_activity_rollups AS
SELECT
  u.school_id,
  DATE(ua."createdAt") AS activity_date,
  COUNT(DISTINCT ua.user_id) AS active_students,
  COUNT(DISTINCT ua.id) AS total_activities,
  COUNT(DISTINCT CASE 
    WHEN ua.completed = true 
    THEN ua.id 
  END) AS completed_activities,
  -- Timer is in milliseconds, convert to minutes
  SUM(COALESCE(ua.timer, 0)) / 1000.0 / 60.0 AS total_time_minutes,
  AVG(COALESCE(ua.timer, 0)) / 1000.0 / 60.0 AS avg_time_per_activity,
  COUNT(DISTINCT CASE 
    WHEN ua.activity_type = 'ARTICLE_READ' 
    THEN ua.id 
  END) AS reading_count,
  COUNT(DISTINCT CASE 
    WHEN ua.activity_type = 'MC_QUESTION' 
    THEN ua.id 
  END) AS mcq_count,
  COUNT(DISTINCT CASE 
    WHEN ua.activity_type = 'SA_QUESTION' 
    THEN ua.id 
  END) AS saq_count,
  COUNT(DISTINCT CASE 
    WHEN ua.activity_type = 'LA_QUESTION' 
    THEN ua.id 
  END) AS laq_count
FROM "UserActivity" ua
JOIN users u ON ua.user_id = u.id
WHERE u.role = 'STUDENT'
  AND ua."createdAt" >= NOW() - INTERVAL '90 days'
GROUP BY u.school_id, DATE(ua."createdAt");

CREATE INDEX mv_daily_activity_rollups_school_id_idx ON mv_daily_activity_rollups(school_id);
CREATE INDEX mv_daily_activity_rollups_date_idx ON mv_daily_activity_rollups(activity_date);
CREATE INDEX mv_daily_activity_rollups_school_date_idx ON mv_daily_activity_rollups(school_id, activity_date);
