-- Data checks for primary_parity_stories_20261011. SELECT only.
-- Legacy checks run on the legacy copy. New checks run on the rehearsal target after the ETL.

-- LEGACY L1: story and chapter counts (2026-10-12: 412 stories, 3296 chapters).
select count(*) as stories, count(*) filter (where is_published) as published from stories;
select count(*) as chapters, count(distinct "storyId") as stories_with_chapters from story_chapters;
-- LEGACY L2: chapter question rows (32960, 16480, 16480, 3296, 5).
select (select count(*) from multiple_choice_questions where story_chapter_id is not null) as mcq,
       (select count(*) from short_answer_questions where story_chapter_id is not null) as saq,
       (select count(*) from long_answer_questions where story_chapter_id is not null) as laq,
       (select count(*) from sentencs_and_words_for_flashcard where story_chapter_id is not null) as flash_src,
       (select count(*) from flashcard_cards where story_chapter_id is not null) as cards;

-- NEW S1: the same counts in the target (run on the new database).
select count(*) as stories, count(*) filter (where is_public) as public_stories, count(*) filter (where image is not null) as with_image from stories;
select count(*) as chapters, count(*) filter (where image is not null) as with_image, count(*) filter (where audio_url is null) as no_audio from chapters;
-- NEW S2: level window (the student's level 5 shows raLevel 4 to 6).
select count(*) from stories where is_public and ra_level between 4 and 6;
-- NEW S3: chapters for each story (8 for each story on this copy).
select min(c), max(c) from (select count(*) c from chapters group by story_id) x;
-- NEW S4: graph condition (spec D6): chapter rows have a NULL article_id. Expect 0 in both queries.
select count(*) from sentencs_and_words_for_flashcard where chapter_id is not null and article_id is not null;
select count(*) from sentencs_and_words_for_flashcard where chapter_id is null and article_id is null;
-- NEW S5: XP and activity after a check (replace :student_id; before and after the check).
select xp from users where id = :'student_id';
select activity_type, target_id, count(*) from user_activity where user_id = :'student_id' and activity_type like 'STORIES_%' group by 1, 2;
-- NEW S6: id map rows (412 stories, 3296 chapters).
select table_name, count(*) from primary_legacy_id_map where table_name in ('stories', 'story_chapters') group by 1;
