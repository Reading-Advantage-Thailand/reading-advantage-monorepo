-- Add indexes on frequently queried foreign key columns
CREATE INDEX IF NOT EXISTS "codecamp_lessons_module_id_idx" ON "codecamp_lessons" ("module_id");
CREATE INDEX IF NOT EXISTS "codecamp_exercises_lesson_id_idx" ON "codecamp_exercises" ("lesson_id");
CREATE INDEX IF NOT EXISTS "codecamp_quiz_questions_lesson_id_idx" ON "codecamp_quiz_questions" ("lesson_id");
CREATE INDEX IF NOT EXISTS "codecamp_user_progress_user_id_idx" ON "codecamp_user_progress" ("user_id");
CREATE INDEX IF NOT EXISTS "codecamp_user_progress_lesson_id_idx" ON "codecamp_user_progress" ("lesson_id");
CREATE INDEX IF NOT EXISTS "codecamp_chat_conversations_user_id_idx" ON "codecamp_chat_conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "codecamp_chat_messages_conversation_id_idx" ON "codecamp_chat_messages" ("conversation_id");
