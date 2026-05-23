-- Enhanced CEFR vs RA Alignment Metrics Migration
-- Adds assignment-level override capability and comprehensive alignment tracking

-- Add alignment_override column to assignments table
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "alignment_override" JSONB;

-- Drop the existing mv_cefr_ra_alignment view to recreate with enhancements
DROP MATERIALIZED VIEW IF EXISTS mv_cefr_ra_alignment;

-- Create Enhanced Alignment Metrics Materialized View
-- Tracks Below/Aligned/Above buckets per student/class/school with sample assignments
CREATE MATERIALIZED VIEW mv_alignment_metrics AS
WITH student_reading_data AS (
  SELECT 
    u.id AS user_id,
    u.email,
    u.name AS display_name,
    u.school_id,
    u.level AS student_ra_level,
    u.cefr_level AS student_cefr_level,
    rcm.cefr_level AS mapped_student_cefr_level,
    lr.article_id,
    a.ra_level AS article_ra_level,
    a.cefr_level AS article_cefr_level,
    a.title AS article_title,
    a.genre AS article_genre,
    lr.created_at AS read_at,
    -- Check for assignment-level overrides
    COALESCE(
      (asg.alignment_override->>'ra_level')::int,
      a.ra_level
    ) AS effective_article_ra_level,
    COALESCE(
      asg.alignment_override->>'cefr_level',
      a.cefr_level
    ) AS effective_article_cefr_level,
    asg.id AS assignment_id,
    cs.classroom_id
  FROM users u
  LEFT JOIN ra_cefr_mappings rcm ON u.level = rcm.ra_level
  LEFT JOIN lesson_records lr ON u.id = lr.user_id
  LEFT JOIN article a ON lr.article_id = a.id
  LEFT JOIN student_assignments sa ON sa.student_id = u.id
  LEFT JOIN assignments asg ON sa.assignment_id = asg.id AND asg.article_id = a.id
  LEFT JOIN "classroomStudents" cs ON u.id = cs.student_id
  WHERE u.role = 'STUDENT'
    AND lr.created_at >= NOW() - INTERVAL '90 days'
    AND a.ra_level IS NOT NULL
),
alignment_classification AS (
  SELECT 
    *,
    CASE 
      WHEN effective_article_ra_level IS NULL THEN 'unknown'
      WHEN effective_article_ra_level < student_ra_level - 1 THEN 'below'
      WHEN effective_article_ra_level > student_ra_level + 1 THEN 'above'
      ELSE 'aligned'
    END AS alignment_bucket
  FROM student_reading_data
)
-- Student-level aggregations
SELECT
  user_id AS scope_id,
  'student' AS scope_type,
  user_id,
  display_name,
  email,
  classroom_id,
  student_ra_level,
  student_cefr_level,
  mapped_student_cefr_level,
  
  -- Alignment bucket counts
  COUNT(*) AS total_readings,
  COUNT(CASE WHEN alignment_bucket = 'below' THEN 1 END) AS below_count,
  COUNT(CASE WHEN alignment_bucket = 'aligned' THEN 1 END) AS aligned_count,
  COUNT(CASE WHEN alignment_bucket = 'above' THEN 1 END) AS above_count,
  COUNT(CASE WHEN alignment_bucket = 'unknown' THEN 1 END) AS unknown_count,
  
  -- Percentages
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'below' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS below_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'aligned' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS aligned_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'above' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS above_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'unknown' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS unknown_pct,
  
  -- Sample articles for each bucket (top 3 most recent)
  JSONB_AGG(
    CASE WHEN alignment_bucket = 'below' THEN
      JSONB_BUILD_OBJECT(
        'articleId', article_id,
        'title', article_title,
        'articleRaLevel', effective_article_ra_level,
        'articleCefrLevel', effective_article_cefr_level,
        'readAt', read_at,
        'assignmentId', assignment_id,
        'genre', article_genre
      )
    END
  ) FILTER (WHERE alignment_bucket = 'below') AS below_samples,
  
  JSONB_AGG(
    CASE WHEN alignment_bucket = 'aligned' THEN
      JSONB_BUILD_OBJECT(
        'articleId', article_id,
        'title', article_title,
        'articleRaLevel', effective_article_ra_level,
        'articleCefrLevel', effective_article_cefr_level,
        'readAt', read_at,
        'assignmentId', assignment_id,
        'genre', article_genre
      )
    END
  ) FILTER (WHERE alignment_bucket = 'aligned') AS aligned_samples,
  
  JSONB_AGG(
    CASE WHEN alignment_bucket = 'above' THEN
      JSONB_BUILD_OBJECT(
        'articleId', article_id,
        'title', article_title,
        'articleRaLevel', effective_article_ra_level,
        'articleCefrLevel', effective_article_cefr_level,
        'readAt', read_at,
        'assignmentId', assignment_id,
        'genre', article_genre
      )
    END
  ) FILTER (WHERE alignment_bucket = 'above') AS above_samples,
  
  -- Metadata
  MIN(read_at) AS first_reading_at,
  MAX(read_at) AS last_reading_at,
  COUNT(DISTINCT article_id) AS unique_articles,
  COUNT(DISTINCT assignment_id) FILTER (WHERE assignment_id IS NOT NULL) AS assigned_articles
  
FROM alignment_classification
GROUP BY 
  user_id, display_name, email, classroom_id,
  student_ra_level, student_cefr_level, mapped_student_cefr_level

UNION ALL

-- Class-level aggregations
SELECT
  cs.classroom_id AS scope_id,
  'classroom' AS scope_type,
  NULL AS user_id,
  NULL AS display_name,
  NULL AS email,
  cs.classroom_id,
  NULL AS student_ra_level,
  NULL AS student_cefr_level,
  NULL AS mapped_student_cefr_level,
  
  COUNT(*) AS total_readings,
  COUNT(CASE WHEN alignment_bucket = 'below' THEN 1 END) AS below_count,
  COUNT(CASE WHEN alignment_bucket = 'aligned' THEN 1 END) AS aligned_count,
  COUNT(CASE WHEN alignment_bucket = 'above' THEN 1 END) AS above_count,
  COUNT(CASE WHEN alignment_bucket = 'unknown' THEN 1 END) AS unknown_count,
  
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'below' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS below_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'aligned' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS aligned_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'above' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS above_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'unknown' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS unknown_pct,
  
  -- Sample outlier articles (most misaligned)
  JSONB_AGG(
    CASE WHEN alignment_bucket = 'below' THEN
      JSONB_BUILD_OBJECT(
        'articleId', article_id,
        'title', article_title,
        'articleRaLevel', effective_article_ra_level,
        'studentRaLevel', student_ra_level,
        'levelDiff', student_ra_level - effective_article_ra_level,
        'readAt', read_at,
        'assignmentId', assignment_id
      )
    END
  ) FILTER (WHERE alignment_bucket = 'below') AS below_samples,
  
  NULL AS aligned_samples,
  
  JSONB_AGG(
    CASE WHEN alignment_bucket = 'above' THEN
      JSONB_BUILD_OBJECT(
        'articleId', article_id,
        'title', article_title,
        'articleRaLevel', effective_article_ra_level,
        'studentRaLevel', student_ra_level,
        'levelDiff', effective_article_ra_level - student_ra_level,
        'readAt', read_at,
        'assignmentId', assignment_id
      )
    END
  ) FILTER (WHERE alignment_bucket = 'above') AS above_samples,
  
  MIN(read_at) AS first_reading_at,
  MAX(read_at) AS last_reading_at,
  COUNT(DISTINCT article_id) AS unique_articles,
  COUNT(DISTINCT assignment_id) FILTER (WHERE assignment_id IS NOT NULL) AS assigned_articles
  
FROM alignment_classification ac
LEFT JOIN "classroomStudents" cs ON ac.user_id = cs.student_id
WHERE cs.classroom_id IS NOT NULL
GROUP BY cs.classroom_id

UNION ALL

-- School-level aggregations
SELECT
  COALESCE(school_id, 'system') AS scope_id,
  'school' AS scope_type,
  NULL AS user_id,
  NULL AS display_name,
  NULL AS email,
  NULL AS classroom_id,
  NULL AS student_ra_level,
  NULL AS student_cefr_level,
  NULL AS mapped_student_cefr_level,
  
  COUNT(*) AS total_readings,
  COUNT(CASE WHEN alignment_bucket = 'below' THEN 1 END) AS below_count,
  COUNT(CASE WHEN alignment_bucket = 'aligned' THEN 1 END) AS aligned_count,
  COUNT(CASE WHEN alignment_bucket = 'above' THEN 1 END) AS above_count,
  COUNT(CASE WHEN alignment_bucket = 'unknown' THEN 1 END) AS unknown_count,
  
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'below' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS below_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'aligned' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS aligned_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'above' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS above_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN alignment_bucket = 'unknown' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    1
  ) AS unknown_pct,
  
  -- Top misaligned articles across school
  NULL AS below_samples,
  NULL AS aligned_samples,
  NULL AS above_samples,
  
  MIN(read_at) AS first_reading_at,
  MAX(read_at) AS last_reading_at,
  COUNT(DISTINCT article_id) AS unique_articles,
  COUNT(DISTINCT assignment_id) FILTER (WHERE assignment_id IS NOT NULL) AS assigned_articles
  
FROM alignment_classification
GROUP BY school_id;

-- Create indexes for performance
CREATE UNIQUE INDEX mv_alignment_metrics_unique_idx ON mv_alignment_metrics(scope_id, scope_type);
CREATE INDEX mv_alignment_metrics_user_idx ON mv_alignment_metrics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX mv_alignment_metrics_classroom_idx ON mv_alignment_metrics(classroom_id) WHERE classroom_id IS NOT NULL;

-- Update the refresh script to include the new view
-- This view should be refreshed regularly as reading data changes
COMMENT ON MATERIALIZED VIEW mv_alignment_metrics IS 
'Enhanced alignment metrics tracking student reading vs RA/CEFR levels with assignment overrides and sample data';