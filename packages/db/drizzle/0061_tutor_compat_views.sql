-- Tutor compatibility views (track primary_legacy_data_migration_20261004, FR-2, decision D4).
-- Tutor reads four legacy tables by name with a text cuid id. These read-only
-- views expose the shared tables under the legacy names and column shapes.
-- Tutor sets search_path=tutor_compat. Additive only: no DROP, no ALTER.
CREATE SCHEMA IF NOT EXISTS tutor_compat;
--> statement-breakpoint
CREATE VIEW tutor_compat.article AS
SELECT
	coalesce(m.legacy_id, a.id::text) AS id,
	a.title AS title,
	a.summary AS summary,
	coalesce(a.passage, a.content) AS passage,
	a.cefr_level AS cefr_level,
	a.ra_level AS ra_level,
	a.words AS words,
	a.sentences AS sentences,
	a.translated_passage AS translated_passage,
	a.translated_summary AS translated_summary,
	a.audio_url AS audio_url,
	a.audio_word_url AS audio_word_url,
	a.genre AS genre,
	a.type AS type,
	a.is_published AS is_published
FROM public.articles a
LEFT JOIN public.primary_legacy_id_map m ON m.table_name = 'article' AND m.new_id = a.id;
--> statement-breakpoint
CREATE VIEW tutor_compat.multiple_choice_questions AS
SELECT
	coalesce(mq.legacy_id, q.id::text) AS id,
	q.question AS question,
	CASE WHEN jsonb_typeof(q.options) = 'array'
		THEN ARRAY(SELECT jsonb_array_elements_text(q.options))
	END AS options,
	coalesce(q.answer, q.options ->> q.correct_answer) AS answer,
	coalesce(ma.legacy_id, q.article_id::text) AS article_id
FROM public.multiple_choice_questions q
LEFT JOIN public.primary_legacy_id_map mq ON mq.table_name = 'multiple_choice_questions' AND mq.new_id = q.id
LEFT JOIN public.primary_legacy_id_map ma ON ma.table_name = 'article' AND ma.new_id = q.article_id;
--> statement-breakpoint
CREATE VIEW tutor_compat.short_answer_questions AS
SELECT
	coalesce(mq.legacy_id, q.id::text) AS id,
	q.question AS question,
	coalesce(q.answer, q.sample_answer) AS answer,
	coalesce(ma.legacy_id, q.article_id::text) AS article_id
FROM public.short_answer_questions q
LEFT JOIN public.primary_legacy_id_map mq ON mq.table_name = 'short_answer_questions' AND mq.new_id = q.id
LEFT JOIN public.primary_legacy_id_map ma ON ma.table_name = 'article' AND ma.new_id = q.article_id;
--> statement-breakpoint
CREATE VIEW tutor_compat.sentencs_and_words_for_flashcard AS
SELECT
	f.sentence AS sentence,
	f.audio_sentences_url AS audio_sentences_url,
	f.words AS words,
	f.words_url AS words_url,
	coalesce(ma.legacy_id, f.article_id::text) AS article_id
FROM public.sentencs_and_words_for_flashcard f
LEFT JOIN public.primary_legacy_id_map ma ON ma.table_name = 'article' AND ma.new_id = f.article_id;
