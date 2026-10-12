-- Data checks of primary_parity_qr_path_20261011 (acceptance checks A1 to A5).
-- READ ONLY. Run on the rehearsal copy after the catalogue build (class books track).
-- Output holds counts and keys only. No name, no username, and no class code.

-- A1/A4/A5: the five book keys of the printed URLs exist, 14 lessons each (range text "Lessons 1 to 14").
SELECT b.key, b.name, b.lesson_count, count(l.id) AS lessons
FROM primary_books b LEFT JOIN primary_book_lessons l ON l.book_id = b.id
GROUP BY b.key, b.name, b.lesson_count ORDER BY b.key;   -- expect o1, o2, o3-1, o3-2, q4

-- A1/A2: lesson 1 of o3-2 is linked and approved (the student reaches the lesson flow, not "not ready").
SELECT l.number, l.title, l.approved, l.article_id IS NOT NULL AS linked, l.legacy_article_id
FROM primary_book_lessons l JOIN primary_books b ON b.id = l.book_id
WHERE b.key = 'o3-2' AND l.number = 1;   -- expect approved, linked, cmtyina5w000ps601n6htj9g3

-- A1/A2: the linked article is the migrated legacy article of the printed link (map table row exists).
SELECT count(*) AS map_rows
FROM primary_legacy_id_map m
WHERE m.table_name = 'article' AND m.legacy_id = 'cmtyina5w000ps601n6htj9g3';   -- expect 1

-- A5b: lesson 999 does not exist (the "no such lesson" page).
SELECT count(*) AS lessons_999 FROM primary_book_lessons l JOIN primary_books b ON b.id = l.book_id
WHERE b.key = 'o3-2' AND l.number = 999;   -- expect 0

-- A5a: no book has key zz.
SELECT count(*) AS books_zz FROM primary_books WHERE key = 'zz';   -- expect 0

-- A3: a class that has o3-2 exists for the teacher (assign through the class book browser check first).
SELECT count(*) AS classes_with_o3_2
FROM primary_class_books cb JOIN primary_books b ON b.id = cb.book_id WHERE b.key = 'o3-2';   -- expect 1 or more
