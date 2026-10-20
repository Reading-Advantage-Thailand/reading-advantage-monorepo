-- Data checks of primary_parity_class_books_20261011 (acceptance checks A1 to A5).
-- READ ONLY. Run on the rehearsal copy after the catalogue build and after the browser check.
-- Output holds counts and keys only. No name, no username, and no class code.

-- A1: the assign form lists the five books. Expect 5 rows, 14 lessons each.
SELECT b.key, b.name, b.lesson_count, count(l.id) AS lessons
FROM primary_books b LEFT JOIN primary_book_lessons l ON l.book_id = b.id
GROUP BY b.key, b.name, b.lesson_count ORDER BY b.key;

-- A2: lesson 1 of o3-2 has a linked, approved article and a question bank (the answer key).
SELECT l.number, l.approved, l.article_id IS NOT NULL AS linked,
       jsonb_array_length(coalesce(l.package->'bank'->'mcq', '[]'::jsonb)) AS mcq
FROM primary_book_lessons l JOIN primary_books b ON b.id = l.book_id
WHERE b.key = 'o3-2' AND l.number = 1;
-- All lessons: how many are linked to an article (expect 70 linked, 0 unmapped).
SELECT count(*) AS lessons, count(article_id) AS linked, count(*) FILTER (WHERE approved) AS approved FROM primary_book_lessons;

-- A2 and A5: the teacher guide holds 13 steps for en and 13 for th.
SELECT locale, count(*) AS steps FROM primary_lesson_guides GROUP BY locale ORDER BY locale;

-- A3 and S6: class books after the browser check. The pointer must be back on lesson 1.
SELECT b.key, cb.mode, cb.current_lesson,
       (SELECT count(*) FROM primary_class_book_lessons x WHERE x.class_book_id = cb.id AND x.taught_at IS NOT NULL) AS taught,
       (SELECT coalesce(max(jsonb_array_length(x.steps_done)), 0) FROM primary_class_book_lessons x WHERE x.class_book_id = cb.id) AS steps_marked
FROM primary_class_books cb JOIN primary_books b ON b.id = cb.book_id ORDER BY b.key;

-- A4: the QR key of lesson 1 of o3-2 points to the article of the printed legacy link.
SELECT l.legacy_article_id, l.article_id IS NOT NULL AS linked
FROM primary_book_lessons l JOIN primary_books b ON b.id = l.book_id
WHERE b.key = 'o3-2' AND l.number = 1;   -- expect cmtyina5w000ps601n6htj9g3, linked
