-- Drop existing simple velocity matview
DROP MATERIALIZED VIEW IF EXISTS mv_student_velocity CASCADE;

-- Enhanced Student Velocity Metrics with XP, EMA, and ETA
CREATE MATERIALIZED VIEW mv_student_velocity AS
WITH xp_data AS (
  SELECT 
    u.id AS user_id,
    u.email,
    u.name AS display_name,
    u.school_id,
    u.xp AS current_xp,
    u.level AS current_level,
    u.cefr_level,
    -- XP aggregations for different time windows
    SUM(CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '7 days' THEN xpl.xp_earned ELSE 0 END) AS xp_last_7d,
    SUM(CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '30 days' THEN xpl.xp_earned ELSE 0 END) AS xp_last_30d,
    -- Active days count
    COUNT(DISTINCT CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '7 days' THEN DATE(xpl."createdAt") END) AS active_days_7d,
    COUNT(DISTINCT CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '30 days' THEN DATE(xpl."createdAt") END) AS active_days_30d,
    -- Last activity
    MAX(xpl."createdAt") AS last_activity_at,
    -- Article count for context
    COUNT(DISTINCT CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '7 days' THEN xpl.id END) AS activities_last_7d,
    COUNT(DISTINCT CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '30 days' THEN xpl.id END) AS activities_last_30d
  FROM users u
  LEFT JOIN "XPLogs" xpl ON u.id = xpl.user_id
  WHERE u.role = 'STUDENT'
  GROUP BY u.id, u.email, u.name, u.school_id, u.xp, u.level, u.cefr_level
),
level_data AS (
  -- Calculate XP needed for next level based on level progression
  -- Levels 0-18 with XP thresholds
  SELECT 
    level,
    min_xp,
    LEAD(min_xp, 1, 243000) OVER (ORDER BY level) AS max_xp
  FROM (
    VALUES 
      (0, 0), (1, 5000), (2, 11000), (3, 18000), (4, 26000), (5, 35000),
      (6, 45000), (7, 56000), (8, 68000), (9, 81000), (10, 95000),
      (11, 110000), (12, 126000), (13, 143000), (14, 161000), (15, 180000),
      (16, 200000), (17, 221000), (18, 243000)
  ) AS levels(level, min_xp)
)
SELECT 
  xd.user_id,
  xd.email,
  xd.display_name,
  xd.school_id,
  xd.current_xp,
  xd.current_level,
  xd.cefr_level,
  
  -- 7-day metrics
  xd.xp_last_7d,
  xd.active_days_7d,
  CASE 
    WHEN xd.active_days_7d > 0 THEN ROUND((xd.xp_last_7d::numeric / xd.active_days_7d), 2)
    ELSE 0 
  END AS xp_per_active_day_7d,
  ROUND((xd.xp_last_7d::numeric / 7), 2) AS xp_per_calendar_day_7d,
  
  -- 30-day metrics  
  xd.xp_last_30d,
  xd.active_days_30d,
  CASE 
    WHEN xd.active_days_30d > 0 THEN ROUND((xd.xp_last_30d::numeric / xd.active_days_30d), 2)
    ELSE 0 
  END AS xp_per_active_day_30d,
  ROUND((xd.xp_last_30d::numeric / 30), 2) AS xp_per_calendar_day_30d,
  
  -- XP to next level
  COALESCE(ld.max_xp - xd.current_xp, 0) AS xp_to_next_level,
  ld.max_xp AS next_level_xp,
  
  -- Activity counts for context
  xd.activities_last_7d,
  xd.activities_last_30d,
  
  -- Last activity timestamp
  xd.last_activity_at,
  
  -- Metadata for ETA calculation (done in application layer)
  -- Flag for low-signal cases
  CASE 
    WHEN xd.active_days_30d < 3 OR (xd.xp_last_30d::numeric / NULLIF(xd.active_days_30d, 0)) < 0.5 
    THEN true 
    ELSE false 
  END AS is_low_signal
  
FROM xp_data xd
LEFT JOIN level_data ld ON xd.current_level = ld.level;

-- Indexes for efficient querying
CREATE UNIQUE INDEX mv_student_velocity_v2_user_id_idx ON mv_student_velocity(user_id);
CREATE INDEX mv_student_velocity_v2_school_id_idx ON mv_student_velocity(school_id);
CREATE INDEX mv_student_velocity_v2_low_signal_idx ON mv_student_velocity(is_low_signal);

-- Class-level Velocity Metrics
CREATE MATERIALIZED VIEW mv_class_velocity AS
WITH student_xp AS (
  SELECT 
    cs.classroom_id,
    c.school_id,
    c.classroom_name,
    c.grade,
    COUNT(DISTINCT cs.student_id) AS total_students,
    SUM(CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '7 days' THEN xpl.xp_earned ELSE 0 END) AS total_xp_7d,
    SUM(CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '30 days' THEN xpl.xp_earned ELSE 0 END) AS total_xp_30d,
    COUNT(DISTINCT CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '7 days' THEN xpl.user_id END) AS active_students_7d,
    COUNT(DISTINCT CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '30 days' THEN xpl.user_id END) AS active_students_30d,
    MAX(xpl."createdAt") AS last_activity_at
  FROM "classroomStudents" cs
  JOIN classrooms c ON cs.classroom_id = c.id
  LEFT JOIN "XPLogs" xpl ON cs.student_id = xpl.user_id
  GROUP BY cs.classroom_id, c.school_id, c.classroom_name, c.grade
)
SELECT
  classroom_id,
  school_id,
  classroom_name,
  grade,
  total_students,
  
  -- 7-day metrics
  total_xp_7d,
  active_students_7d,
  CASE 
    WHEN active_students_7d > 0 THEN ROUND((total_xp_7d::numeric / active_students_7d), 2)
    ELSE 0 
  END AS avg_xp_per_student_7d,
  ROUND((total_xp_7d::numeric / 7), 2) AS xp_per_day_7d,
  
  -- 30-day metrics
  total_xp_30d,
  active_students_30d,
  CASE 
    WHEN active_students_30d > 0 THEN ROUND((total_xp_30d::numeric / active_students_30d), 2)
    ELSE 0 
  END AS avg_xp_per_student_30d,
  ROUND((total_xp_30d::numeric / 30), 2) AS xp_per_day_30d,
  
  -- Engagement rate
  CASE 
    WHEN total_students > 0 THEN ROUND((active_students_30d::numeric / total_students * 100), 1)
    ELSE 0 
  END AS engagement_rate_30d,
  
  last_activity_at,
  
  -- Low signal flag
  CASE 
    WHEN active_students_30d < 3 OR (total_xp_30d::numeric / 30) < 5 
    THEN true 
    ELSE false 
  END AS is_low_signal
  
FROM student_xp;

CREATE UNIQUE INDEX mv_class_velocity_classroom_id_idx ON mv_class_velocity(classroom_id);
CREATE INDEX mv_class_velocity_school_id_idx ON mv_class_velocity(school_id);

-- School-level Velocity Metrics
CREATE MATERIALIZED VIEW mv_school_velocity AS
WITH school_xp AS (
  SELECT 
    s.id AS school_id,
    s.name AS school_name,
    COUNT(DISTINCT u.id) AS total_students,
    SUM(CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '7 days' THEN xpl.xp_earned ELSE 0 END) AS total_xp_7d,
    SUM(CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '30 days' THEN xpl.xp_earned ELSE 0 END) AS total_xp_30d,
    COUNT(DISTINCT CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '7 days' THEN xpl.user_id END) AS active_students_7d,
    COUNT(DISTINCT CASE WHEN xpl."createdAt" >= NOW() - INTERVAL '30 days' THEN xpl.user_id END) AS active_students_30d,
    MAX(xpl."createdAt") AS last_activity_at
  FROM schools s
  LEFT JOIN users u ON s.id = u.school_id AND u.role = 'STUDENT'
  LEFT JOIN "XPLogs" xpl ON u.id = xpl.user_id
  GROUP BY s.id, s.name
)
SELECT
  school_id,
  school_name,
  total_students,
  
  -- 7-day metrics
  total_xp_7d,
  active_students_7d,
  CASE 
    WHEN active_students_7d > 0 THEN ROUND((total_xp_7d::numeric / active_students_7d), 2)
    ELSE 0 
  END AS avg_xp_per_student_7d,
  ROUND((total_xp_7d::numeric / 7), 2) AS xp_per_day_7d,
  
  -- 30-day metrics
  total_xp_30d,
  active_students_30d,
  CASE 
    WHEN active_students_30d > 0 THEN ROUND((total_xp_30d::numeric / active_students_30d), 2)
    ELSE 0 
  END AS avg_xp_per_student_30d,
  ROUND((total_xp_30d::numeric / 30), 2) AS xp_per_day_30d,
  
  -- Engagement rate
  CASE 
    WHEN total_students > 0 THEN ROUND((active_students_30d::numeric / total_students * 100), 1)
    ELSE 0 
  END AS engagement_rate_30d,
  
  last_activity_at,
  
  -- Low signal flag
  CASE 
    WHEN active_students_30d < 10 OR (total_xp_30d::numeric / 30) < 20 
    THEN true 
    ELSE false 
  END AS is_low_signal
  
FROM school_xp;

CREATE UNIQUE INDEX mv_school_velocity_school_id_idx ON mv_school_velocity(school_id);
