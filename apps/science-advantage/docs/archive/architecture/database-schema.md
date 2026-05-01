---
title: Database Schema Documentation
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, architecture, database, schema, prisma]
description: Documentation of the database schema, relationships, and data models.
---

# Database Schema

## Overview

This section defines the complete PostgreSQL database schema for Science Advantage, transforming the conceptual data models into production-ready database structures. The schema is designed for performance, scalability, and educational data integrity.

## Design Principles

- **UUID Primary Keys**: All entities use UUIDs for global uniqueness and security
- **JSONB Flexibility**: Extensible storage for varied educational content
- **Audit Trail**: Created/updated timestamps with timezone awareness
- **Performance Optimization**: Strategic indexing for educational workloads
- **Data Integrity**: Comprehensive constraints and foreign key relationships
- **Full-Text Search**: Native PostgreSQL search capabilities

## Schema DDL

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ========================================
-- ENUM TYPES
-- ========================================

CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE class_status AS ENUM ('ACTIVE', 'ARCHIVED', 'DRAFT');
CREATE TYPE lesson_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE question_type AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY');
CREATE TYPE difficulty_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE experiment_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE submission_status AS ENUM ('DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED');

-- ========================================
-- CORE USER MANAGEMENT
-- ========================================

-- Users table - central user management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    profile_image_url VARCHAR(500),
    google_id VARCHAR(255) UNIQUE, -- For Google OAuth integration
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_name_check CHECK (LENGTH(TRIM(name)) >= 2)
);

-- User sessions for authentication management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- ========================================
-- CLASS MANAGEMENT
-- ========================================

-- Classes/courses
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID NOT NULL REFERENCES users(id),
    status class_status NOT NULL DEFAULT 'DRAFT',
    class_code VARCHAR(20) UNIQUE NOT NULL, -- For student enrollment
    grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 12),
    subject VARCHAR(100),
    academic_year VARCHAR(20), -- e.g., "2024-2025"
    max_students INTEGER DEFAULT 50,
    settings JSONB DEFAULT '{}', -- Class-specific settings
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT classes_title_check CHECK (LENGTH(TRIM(title)) >= 3),
    CONSTRAINT classes_class_code_check CHECK (class_code ~* '^[A-Z0-9]{3,20}$')
);

-- Class enrollments (many-to-many relationship)
CREATE TABLE class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DROPPED', 'COMPLETED')),

    -- Ensure unique enrollment
    UNIQUE(class_id, student_id)
);

-- ========================================
-- CURRICULUM CONTENT
-- ========================================

-- Lessons - core educational content
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL, -- URL-friendly identifier
    description TEXT,
    content JSONB NOT NULL DEFAULT '{}', -- Rich content structure
    learning_objectives TEXT[], -- Array of learning objectives
    difficulty difficulty_level NOT NULL DEFAULT 'BEGINNER',
    estimated_duration INTEGER, -- in minutes
    subject VARCHAR(100),
    grade_levels INTEGER[], -- Array of applicable grade levels
    tags TEXT[], -- Searchable tags
    status lesson_status NOT NULL DEFAULT 'DRAFT',
    author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT lessons_title_check CHECK (LENGTH(TRIM(title)) >= 3),
    CONSTRAINT lessons_slug_check CHECK (slug ~* '^[a-z0-9-]+$'),
    CONSTRAINT lessons_duration_check CHECK (estimated_duration > 0)
);

-- Lesson assignments to classes
CREATE TABLE class_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    order_index INTEGER NOT NULL, -- For lesson sequencing
    is_required BOOLEAN DEFAULT true,

    -- Ensure unique lesson per class
    UNIQUE(class_id, lesson_id)
);

-- ========================================
-- ASSESSMENT SYSTEM
-- ========================================

-- Quizzes for lessons
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    time_limit INTEGER, -- in minutes, NULL for no limit
    passing_score INTEGER DEFAULT 70, -- percentage
    max_attempts INTEGER DEFAULT 3,
    shuffle_questions BOOLEAN DEFAULT false,
    show_correct_answers BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT quizzes_title_check CHECK (LENGTH(TRIM(title)) >= 3),
    CONSTRAINT quizzes_passing_score_check CHECK (passing_score BETWEEN 0 AND 100),
    CONSTRAINT quizzes_max_attempts_check CHECK (max_attempts > 0)
);

-- Quiz questions
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    options JSONB, -- For multiple choice: [{"text": "Option A", "correct": true}, ...]
    correct_answer TEXT, -- For non-MCQ types
    explanation TEXT, -- Explanation of the correct answer
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    difficulty difficulty_level DEFAULT 'BEGINNER',

    -- Constraints
    CONSTRAINT quiz_questions_points_check CHECK (points > 0),
    CONSTRAINT quiz_questions_order_check CHECK (order_index >= 0)
);

-- ========================================
-- EXPERIMENTS AND HANDS-ON LEARNING
-- ========================================

-- Experiments associated with lessons
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    objectives TEXT[],
    materials JSONB, -- List of required materials
    safety_instructions TEXT,
    procedure JSONB NOT NULL, -- Step-by-step procedure
    expected_outcomes TEXT,
    difficulty difficulty_level DEFAULT 'BEGINNER',
    estimated_duration INTEGER, -- in minutes
    status experiment_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT experiments_title_check CHECK (LENGTH(TRIM(title)) >= 3),
    CONSTRAINT experiments_duration_check CHECK (estimated_duration > 0)
);

-- Experiment data fields for data collection
CREATE TABLE experiment_data_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- text, number, boolean, etc.
    unit VARCHAR(50), -- e.g., "cm", "g", "°C"
    description TEXT,
    is_required BOOLEAN DEFAULT true,
    order_index INTEGER NOT NULL,

    -- Constraints
    CONSTRAINT experiment_data_fields_name_check CHECK (LENGTH(TRIM(field_name)) >= 1),
    CONSTRAINT experiment_data_fields_order_check CHECK (order_index >= 0)
);

-- ========================================
-- STUDENT PROGRESS AND SUBMISSIONS
-- ========================================

-- Lesson progress tracking
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED'
        CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent INTEGER DEFAULT 0, -- in minutes
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique progress record per user per lesson
    UNIQUE(user_id, lesson_id, class_id)
);

-- Quiz attempts and submissions
CREATE TABLE quiz_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    answers JSONB NOT NULL, -- User's answers
    score INTEGER, -- Percentage score
    max_score INTEGER, -- Maximum possible score
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    time_spent INTEGER, -- in seconds
    status submission_status NOT NULL DEFAULT 'DRAFT',

    -- Constraints
    UNIQUE(user_id, quiz_id, attempt_number),
    CONSTRAINT quiz_submissions_score_check CHECK (score BETWEEN 0 AND 100)
);

-- Experiment submissions
CREATE TABLE experiment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    observations TEXT,
    data JSONB, -- Collected experiment data
    conclusions TEXT,
    files JSONB, -- Uploaded files information
    status submission_status NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    grade INTEGER, -- Numeric grade
    feedback TEXT, -- Teacher feedback
    graded_by UUID REFERENCES users(id), -- Teacher who graded
    graded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT experiment_submissions_title_check CHECK (LENGTH(TRIM(title)) >= 3),
    CONSTRAINT experiment_submissions_grade_check CHECK (grade BETWEEN 0 AND 100)
);

-- ========================================
-- ANALYTICS AND REPORTING
-- ========================================

-- User activity logs for analytics
CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- lesson_view, quiz_start, experiment_submit, etc.
    resource_type VARCHAR(50), -- lesson, quiz, experiment, class
    resource_id UUID, -- ID of the resource
    metadata JSONB DEFAULT '{}', -- Additional activity data
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System metrics for performance monitoring
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50),
    tags JSONB DEFAULT '{}', -- For metric categorization
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- User-related indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Class-related indexes
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_subject ON classes(subject);
CREATE INDEX idx_classes_grade_level ON classes(grade_level);
CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);

-- Lesson-related indexes
CREATE INDEX idx_lessons_slug ON lessons(slug);
CREATE INDEX idx_lessons_author_id ON lessons(author_id);
CREATE INDEX idx_lessons_status ON lessons(status);
CREATE INDEX idx_lessons_subject ON lessons(subject);
CREATE INDEX idx_lessons_difficulty ON lessons(difficulty);
CREATE INDEX idx_lessons_grade_levels ON lessons USING GIN(grade_levels);
CREATE INDEX idx_lessons_tags ON lessons USING GIN(tags);
CREATE INDEX idx_lessons_content ON lessons USING GIN(content);
CREATE INDEX idx_lessons_title_fts ON lessons USING GIN(to_tsvector('english', title));
CREATE INDEX idx_lessons_description_fts ON lessons USING GIN(to_tsvector('english', description));
CREATE INDEX idx_class_lessons_class_id ON class_lessons(class_id);
CREATE INDEX idx_class_lessons_lesson_id ON class_lessons(lesson_id);
CREATE INDEX idx_class_lessons_due_date ON class_lessons(due_date);

-- Quiz-related indexes
CREATE INDEX idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_submissions_user_id ON quiz_submissions(user_id);
CREATE INDEX idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX idx_quiz_submissions_status ON quiz_submissions(status);
CREATE INDEX idx_quiz_submissions_submitted_at ON quiz_submissions(submitted_at);

-- Experiment-related indexes
CREATE INDEX idx_experiments_lesson_id ON experiments(lesson_id);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiment_data_fields_experiment_id ON experiment_data_fields(experiment_id);
CREATE INDEX idx_experiment_submissions_user_id ON experiment_submissions(user_id);
CREATE INDEX idx_experiment_submissions_experiment_id ON experiment_submissions(experiment_id);
CREATE INDEX idx_experiment_submissions_status ON experiment_submissions(status);
CREATE INDEX idx_experiment_submissions_submitted_at ON experiment_submissions(submitted_at);

-- Progress tracking indexes
CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_class_id ON lesson_progress(class_id);
CREATE INDEX idx_lesson_progress_status ON lesson_progress(status);
CREATE INDEX idx_lesson_progress_completed_at ON lesson_progress(completed_at);

-- Analytics indexes
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX idx_user_activity_logs_resource ON user_activity_logs(resource_type, resource_id);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- ========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiment_submissions_updated_at BEFORE UPDATE ON experiment_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_accessed_at for lesson progress
CREATE OR REPLACE FUNCTION update_lesson_progress_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lesson_progress_last_accessed BEFORE UPDATE ON lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_lesson_progress_access();

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- Student progress overview
CREATE VIEW student_progress_overview AS
SELECT
    u.id as user_id,
    u.name as student_name,
    u.email,
    c.id as class_id,
    c.title as class_title,
    COUNT(DISTINCT l.id) as total_lessons,
    COUNT(DISTINCT CASE WHEN lp.status = 'COMPLETED' THEN l.id END) as completed_lessons,
    ROUND(
        (COUNT(DISTINCT CASE WHEN lp.status = 'COMPLETED' THEN l.id END) * 100.0 /
         NULLIF(COUNT(DISTINCT l.id), 0)), 2
    ) as completion_percentage,
    AVG(lp.completion_percentage) as average_lesson_completion,
    SUM(lp.time_spent) as total_time_spent
FROM users u
JOIN class_enrollments ce ON u.id = ce.student_id
JOIN classes c ON ce.class_id = c.id
LEFT JOIN class_lessons cl ON c.id = cl.class_id
LEFT JOIN lessons l ON cl.lesson_id = l.id
LEFT JOIN lesson_progress lp ON u.id = lp.user_id AND l.id = lp.lesson_id
WHERE u.role = 'STUDENT' AND ce.status = 'ACTIVE'
GROUP BY u.id, u.name, u.email, c.id, c.title;

-- Class performance summary
CREATE VIEW class_performance_summary AS
SELECT
    c.id as class_id,
    c.title as class_title,
    c.subject,
    c.grade_level,
    t.name as teacher_name,
    COUNT(DISTINCT ce.student_id) as enrolled_students,
    COUNT(DISTINCT l.id) as total_lessons,
    COUNT(DISTINCT CASE WHEN lp.status = 'COMPLETED' THEN lp.id END) as completed_lessons,
    AVG(qs.score) as average_quiz_score,
    COUNT(DISTINCT es.id) as experiment_submissions,
    AVG(es.grade) as average_experiment_grade
FROM classes c
JOIN users t ON c.teacher_id = t.id
LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.status = 'ACTIVE'
LEFT JOIN class_lessons cl ON c.id = cl.class_id
LEFT JOIN lessons l ON cl.lesson_id = l.id
LEFT JOIN lesson_progress lp ON ce.student_id = lp.user_id AND l.id = lp.lesson_id
LEFT JOIN quizzes q ON l.id = q.lesson_id
LEFT JOIN quiz_submissions qs ON ce.student_id = qs.user_id AND q.id = qs.quiz_id AND qs.status = 'GRADED'
LEFT JOIN experiments e ON l.id = e.lesson_id
LEFT JOIN experiment_submissions es ON ce.student_id = es.user_id AND e.id = es.experiment_id AND es.status = 'GRADED'
GROUP BY c.id, c.title, c.subject, c.grade_level, t.name;

-- ========================================
-- SECURITY AND ROW-LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (simplified examples - actual policies would be more sophisticated)
-- Users can only see their own data
CREATE POLICY users_own_data ON users
    FOR ALL USING (id = current_setting('app.current_user_id', true)::UUID);

-- Teachers can see their class enrollments
CREATE POLICY teachers_class_enrollments ON class_enrollments
    FOR ALL USING (
        class_id IN (
            SELECT id FROM classes
            WHERE teacher_id = current_setting('app.current_user_id', true)::UUID
        )
    );

-- Students can only see their own progress
CREATE POLICY students_own_progress ON lesson_progress
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- ========================================
-- INITIAL DATA AND SEEDS
-- ========================================

-- Note: Initial seed data would be handled by the application seed script
-- This section documents the expected seed data structure

-- System configuration would be stored in a settings table
-- Default difficulty levels, subjects, and other reference data
```

## Schema Features

### PostgreSQL-Specific Optimizations

1. **UUID Generation**: Uses `uuid-ossp` extension for secure UUID generation
2. **Full-Text Search**: Native GIN indexes on lesson content with `to_tsvector`
3. **JSONB Storage**: Efficient storage and indexing of flexible content
4. **Array Types**: Native support for grade levels, tags, and learning objectives
5. **Enum Types**: Type-safe constraints for status fields
6. **Timezone Awareness**: All timestamps use `TIMESTAMPTZ`

### Performance Considerations

1. **Strategic Indexing**:
   - Foreign key indexes for join performance
   - GIN indexes for JSONB and array searches
   - Composite indexes for common query patterns

2. **Query Optimization**:
   - Materialized views for complex analytics
   - Partitioning strategy for large activity logs (future enhancement)

3. **Connection Pooling**: Schema designed for efficient connection usage

### Data Integrity

1. **Comprehensive Constraints**: CHECK constraints ensure data validity
2. **Foreign Key Relationships**: Maintains referential integrity
3. **Unique Constraints**: Prevents duplicate enrollments and progress records

### Security Features

1. **Row-Level Security**: Implemented for sensitive user data
2. **Audit Trail**: Activity logging for compliance and analytics
3. **Input Validation**: Email format, name length, and other validations

## Migration Strategy

The schema is designed to support:

1. **Incremental Migrations**: Each table can be created independently
2. **Backward Compatibility**: New fields added as nullable with defaults
3. **Data Migration**: Views and functions support data transformation
4. **Zero-Downtime**: Indexes can be created concurrently

## Integration Points

This schema integrates with:

- **Authentication System**: Google OAuth via `google_id` field
- **File Storage**: Experiment submissions reference external file storage
- **Analytics Engine**: Activity logs feed into analytics systems
- **Search Service**: Full-text search capabilities for content discovery

[Source: data-models.md]
