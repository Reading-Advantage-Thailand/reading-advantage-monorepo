-- Add unique index to mv_activity_heatmap for CONCURRENTLY refresh support
-- This replaces the composite index with a unique index

-- Drop existing composite index
DROP INDEX IF EXISTS mv_activity_heatmap_composite_idx;

-- Create unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_activity_heatmap_unique_idx 
ON mv_activity_heatmap(user_id, activity_date, hour_of_day, activity_type);
