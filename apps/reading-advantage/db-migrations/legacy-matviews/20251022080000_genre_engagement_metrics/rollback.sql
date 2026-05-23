-- Rollback Genre Engagement Metrics

-- Drop materialized views in reverse order
DROP MATERIALIZED VIEW IF EXISTS mv_school_genre_engagement CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_class_genre_engagement CASCADE;  
DROP MATERIALIZED VIEW IF EXISTS mv_genre_engagement_metrics CASCADE;