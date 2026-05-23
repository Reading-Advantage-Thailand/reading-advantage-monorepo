-- Genre Engagement Metrics Materialized View
-- This view aggregates genre engagement data across students and classes
-- including reads, recency, quiz completions, XP earned, and CEFR bucketing
-- Uses UserActivity as the source of truth for activities

DROP MATERIALIZED VIEW IF EXISTS mv_genre_engagement_metrics CASCADE;

-- Main genre engagement metrics view for student/class scope
CREATE MATERIALIZED VIEW mv_genre_engagement_metrics AS
WITH base_engagement AS (
  SELECT 
    u.id as user_id,
    u."cefr_level",
    c.id as classroom_id,
    u."school_id",
    -- Get genre from article or chapter, including from questions
    COALESCE(
      a.genre,  -- Direct article activities
      ch.genre,  -- Direct chapter activities
      a_mcq.genre,  -- MC question's article
      ch_mcq.genre,  -- MC question's chapter
      a_saq.genre,  -- SA question's article
      ch_saq.genre,  -- SA question's chapter
      a_laq.genre,  -- LA question's article
      ch_laq.genre   -- LA question's chapter
    ) as genre,
    
    -- Engagement activity data - get content ID from article/chapter/question
    CASE 
      WHEN ua.activity_type IN ('ARTICLE_READ', 'ARTICLE_RATING', 'VOCABULARY_MATCHING', 'VOCABULARY_FLASHCARDS', 'SENTENCE_MATCHING', 'SENTENCE_FLASHCARDS', 'SENTENCE_ORDERING', 'SENTENCE_WORD_ORDERING', 'LESSON_FLASHCARD', 'LESSON_SENTENCE_FLASHCARDS') THEN ua.target_id
      WHEN ua.activity_type IN ('CHAPTER_READ', 'CHAPTER_RATING', 'STORIES_READ') THEN ua.target_id
      WHEN ua.activity_type = 'MC_QUESTION' THEN COALESCE(mcq.article_id, mcq.chapter_id)
      WHEN ua.activity_type = 'SA_QUESTION' THEN COALESCE(saq.article_id, saq.chapter_id)
      WHEN ua.activity_type = 'LA_QUESTION' THEN COALESCE(laq.article_id, laq.chapter_id)
      ELSE ua.target_id
    END as content_id,
    
    ua."createdAt" as activity_date,
    COALESCE(xp.xp_earned, 0) as xp_earned,
    ua.activity_type,
    
    -- Quiz completion indicators
    CASE 
      WHEN ua.activity_type IN ('MC_QUESTION', 'SA_QUESTION', 'LA_QUESTION') THEN 1 
      ELSE 0 
    END as quiz_completion,
    
    -- Reading activity indicators  
    CASE 
      WHEN ua.activity_type IN ('ARTICLE_READ', 'CHAPTER_READ', 'STORIES_READ') THEN 1
      ELSE 0
    END as read_completion,
    
    -- CEFR bucket (simplified to main level)
    CASE 
      WHEN u."cefr_level" LIKE 'A1%' THEN 'A1'
      WHEN u."cefr_level" LIKE 'A2%' THEN 'A2'
      WHEN u."cefr_level" LIKE 'B1%' THEN 'B1'
      WHEN u."cefr_level" LIKE 'B2%' THEN 'B2'
      WHEN u."cefr_level" LIKE 'C1%' THEN 'C1'
      WHEN u."cefr_level" LIKE 'C2%' THEN 'C2'
      ELSE 'A1'
    END as cefr_bucket

  FROM "UserActivity" ua
  JOIN users u ON ua.user_id = u.id
  LEFT JOIN "classroomStudents" cs ON u.id = cs.student_id
  LEFT JOIN classrooms c ON cs.classroom_id = c.id
  
  -- Direct article/chapter joins (for reads, ratings, practice activities)
  LEFT JOIN article a ON ua.target_id = a.id 
    AND ua.activity_type IN ('ARTICLE_READ', 'ARTICLE_RATING', 'VOCABULARY_MATCHING', 'VOCABULARY_FLASHCARDS', 'SENTENCE_MATCHING', 'SENTENCE_FLASHCARDS', 'SENTENCE_ORDERING', 'SENTENCE_WORD_ORDERING', 'LESSON_FLASHCARD', 'LESSON_SENTENCE_FLASHCARDS')
  LEFT JOIN chapters ch ON ua.target_id = ch.id::text 
    AND ua.activity_type IN ('CHAPTER_READ', 'CHAPTER_RATING', 'STORIES_READ')
  
  -- Question joins to get article/chapter from question records
  LEFT JOIN "MultipleChoiceQuestion" mcq ON ua.target_id = mcq.id AND ua.activity_type = 'MC_QUESTION'
  LEFT JOIN article a_mcq ON mcq.article_id = a_mcq.id
  LEFT JOIN chapters ch_mcq ON mcq.chapter_id = ch_mcq.id
  
  LEFT JOIN "ShortAnswerQuestion" saq ON ua.target_id = saq.id AND ua.activity_type = 'SA_QUESTION'
  LEFT JOIN article a_saq ON saq.article_id = a_saq.id
  LEFT JOIN chapters ch_saq ON saq.chapter_id = ch_saq.id
  
  LEFT JOIN "LongAnswerQuestion" laq ON ua.target_id = laq.id AND ua.activity_type = 'LA_QUESTION'
  LEFT JOIN article a_laq ON laq.article_id = a_laq.id
  LEFT JOIN chapters ch_laq ON laq.chapter_id = ch_laq.id
  
  -- XP join
  LEFT JOIN "XPLogs" xp ON ua.id = xp.activity_id
  
  WHERE ua."createdAt" >= NOW() - INTERVAL '6 months'
    AND COALESCE(
      a.genre, ch.genre,
      a_mcq.genre, ch_mcq.genre,
      a_saq.genre, ch_saq.genre,
      a_laq.genre, ch_laq.genre
    ) IS NOT NULL
    AND u.role IN ('STUDENT', 'USER')
    AND ua.activity_type != 'LEVEL_TEST'  -- Exclude level tests from genre engagement
),

-- Recency scoring (more recent = higher score)
recency_weighted AS (
  SELECT *,
    -- Exponential decay: activities in last 7 days get weight 1.0, 
    -- 30 days get 0.5, 90 days get 0.2, older gets 0.1
    CASE 
      WHEN activity_date >= NOW() - INTERVAL '7 days' THEN 1.0
      WHEN activity_date >= NOW() - INTERVAL '30 days' THEN 0.5
      WHEN activity_date >= NOW() - INTERVAL '90 days' THEN 0.2
      ELSE 0.1
    END as recency_weight
  FROM base_engagement
)

-- Final aggregated metrics
SELECT 
  user_id,
  classroom_id,
  school_id,
  genre,
  cefr_bucket,
  
  -- Read engagement metrics
  COUNT(DISTINCT CASE WHEN read_completion = 1 THEN content_id END) as total_reads,
  COUNT(DISTINCT CASE WHEN read_completion = 1 AND activity_date >= NOW() - INTERVAL '30 days' THEN content_id END) as recent_reads_30d,
  COUNT(DISTINCT CASE WHEN read_completion = 1 AND activity_date >= NOW() - INTERVAL '7 days' THEN content_id END) as recent_reads_7d,
  
  -- Quiz engagement metrics
  SUM(quiz_completion) as total_quiz_completions,
  SUM(CASE WHEN quiz_completion = 1 AND activity_date >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as recent_quiz_completions_30d,
  
  -- XP metrics
  SUM(xp_earned) as total_xp_earned,
  SUM(CASE WHEN activity_date >= NOW() - INTERVAL '30 days' THEN xp_earned ELSE 0 END) as recent_xp_30d,
  
  -- Weighted engagement score (combines recency + activity volume)
  -- Uses activity counts and average XP per activity instead of summing raw XP
  SUM(
    (read_completion * 2.0 + quiz_completion * 1.5) * recency_weight
  ) + (AVG(xp_earned) / 10.0) as weighted_engagement_score,
  
  -- Time-based metrics
  MAX(activity_date) as last_activity_date,
  MIN(activity_date) as first_activity_date,
  COUNT(DISTINCT DATE(activity_date)) as active_days,
  
  -- Frequency metrics
  COUNT(*) as total_activities,
  COUNT(*) / GREATEST(EXTRACT(days FROM NOW() - MIN(activity_date)), 1) as daily_activity_rate,
  
  -- Data freshness
  NOW() as calculated_at

FROM recency_weighted
GROUP BY user_id, classroom_id, school_id, genre, cefr_bucket
HAVING COUNT(*) >= 3; -- Minimum activity threshold

-- Create indexes for efficient querying
CREATE INDEX idx_genre_engagement_user_genre 
ON mv_genre_engagement_metrics (user_id, genre);

CREATE INDEX idx_genre_engagement_classroom_genre 
ON mv_genre_engagement_metrics (classroom_id, genre) 
WHERE classroom_id IS NOT NULL;

CREATE INDEX idx_genre_engagement_school_genre 
ON mv_genre_engagement_metrics (school_id, genre) 
WHERE school_id IS NOT NULL;

CREATE INDEX idx_genre_engagement_cefr_genre 
ON mv_genre_engagement_metrics (cefr_bucket, genre);

CREATE INDEX idx_genre_engagement_weighted_score 
ON mv_genre_engagement_metrics (weighted_engagement_score DESC);

-- Aggregated class-level view
CREATE MATERIALIZED VIEW mv_class_genre_engagement AS
SELECT 
  classroom_id,
  school_id,
  genre,
  cefr_bucket,
  
  -- Aggregated student metrics
  COUNT(DISTINCT user_id) as active_students,
  AVG(weighted_engagement_score) as avg_engagement_score,
  SUM(total_reads) as class_total_reads,
  SUM(total_quiz_completions) as class_total_quiz_completions,
  SUM(total_xp_earned) as class_total_xp,
  
  -- Class-level recency
  MAX(last_activity_date) as class_last_activity,
  AVG(daily_activity_rate) as avg_daily_activity_rate,
  
  -- CEFR distribution
  COUNT(DISTINCT user_id) FILTER (WHERE cefr_bucket = 'A1') as students_a1,
  COUNT(DISTINCT user_id) FILTER (WHERE cefr_bucket = 'A2') as students_a2,
  COUNT(DISTINCT user_id) FILTER (WHERE cefr_bucket = 'B1') as students_b1,
  COUNT(DISTINCT user_id) FILTER (WHERE cefr_bucket = 'B2') as students_b2,
  COUNT(DISTINCT user_id) FILTER (WHERE cefr_bucket = 'C1') as students_c1,
  COUNT(DISTINCT user_id) FILTER (WHERE cefr_bucket = 'C2') as students_c2,
  
  NOW() as calculated_at

FROM mv_genre_engagement_metrics
WHERE classroom_id IS NOT NULL
GROUP BY classroom_id, school_id, genre, cefr_bucket
HAVING COUNT(DISTINCT user_id) >= 2; -- At least 2 students

CREATE INDEX idx_class_genre_engagement_classroom 
ON mv_class_genre_engagement (classroom_id, avg_engagement_score DESC);

CREATE INDEX idx_class_genre_engagement_school 
ON mv_class_genre_engagement (school_id, genre);

-- Aggregated school-level view  
CREATE MATERIALIZED VIEW mv_school_genre_engagement AS
SELECT 
  school_id,
  genre,
  cefr_bucket,
  
  -- School-wide metrics
  COUNT(DISTINCT classroom_id) as active_classrooms,
  COUNT(DISTINCT user_id) as active_students,
  AVG(weighted_engagement_score) as avg_engagement_score,
  SUM(total_reads) as school_total_reads,
  SUM(total_quiz_completions) as school_total_quiz_completions,
  SUM(total_xp_earned) as school_total_xp,
  
  -- School-level trends
  MAX(last_activity_date) as school_last_activity,
  AVG(daily_activity_rate) as avg_daily_activity_rate,
  
  NOW() as calculated_at

FROM mv_genre_engagement_metrics
WHERE school_id IS NOT NULL
GROUP BY school_id, genre, cefr_bucket
HAVING COUNT(DISTINCT user_id) >= 5; -- At least 5 students

CREATE INDEX idx_school_genre_engagement_school 
ON mv_school_genre_engagement (school_id, avg_engagement_score DESC);
