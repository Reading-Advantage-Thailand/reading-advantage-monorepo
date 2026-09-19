-- QA test data for T3 browser games sweep (qa_browser_sweep_20260915).
-- Seeds flashcard content for the two credentialed QA students so the APK
-- games catalog (/en/student/games) has learning content. Test data only;
-- not application code. Idempotent: inserts nothing when records already exist.

-- 0. Leaderboard rows per QA school. The student AppLayout hard-throws when
-- no materialized leaderboard row exists (getSchoolLeaderboardModel), and rows
-- are only created lazily by the ranking-update job. Required to open any
-- student page. See REPORT.md finding F-001.
INSERT INTO leaderboards (school_id, details)
SELECT s.id, jsonb_build_object('schoolName', s.name, 'results', '[]'::jsonb)
FROM schools s
WHERE s.name IN ('QA School A', 'QA School B')
  AND NOT EXISTS (SELECT 1 FROM leaderboards l WHERE l.school_id = s.id);

-- 1. One QA article per school (user_sentence_records requires an article FK).
WITH ins AS (
  INSERT INTO articles (id, title, content, author_id, published, is_public, is_approved, is_draft, is_published)
  SELECT gen_random_uuid(), 'QA Game Content A', 'QA game sentence content.', u.id, true, true, true, false, true
  FROM users u WHERE u.username = 'qa-teacher-a'
    AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.title = 'QA Game Content A')
  RETURNING id
)
SELECT id AS article_a_id INTO TEMP qa_article_a FROM ins;

WITH ins AS (
  INSERT INTO articles (id, title, content, author_id, published, is_public, is_approved, is_draft, is_published)
  SELECT gen_random_uuid(), 'QA Game Content B', 'QA game sentence content.', u.id, true, true, true, false, true
  FROM users u WHERE u.username = 'qa-teacher-b'
    AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.title = 'QA Game Content B')
  RETURNING id
)
SELECT id AS article_b_id INTO TEMP qa_article_b FROM ins;

-- 2. Vocabulary flashcards (user_word_records), 16 words with EN/TH/ZH/VI glosses.
CREATE TEMP TABLE qa_words (idx int, term text, th text, cn text, vi text);
INSERT INTO qa_words VALUES
  (1,'bridge','สะพาน','桥','cây cầu'),
  (2,'forest','ป่า','森林','khu rừng'),
  (3,'lantern','โคมไฟ','灯笼','đèn lồng'),
  (4,'river','แม่น้ำ','河','sông'),
  (5,'castle','ปราสาท','城堡','lâu đài'),
  (6,'dragon','มังกร','龙','rồng'),
  (7,'wizard','พ่อมด','巫师','pháp sư'),
  (8,'potion','ยา','药水','thuốc'),
  (9,'sword','ดาบ','剑','kiếm'),
  (10,'magic','เวทมนตร์','魔法','ma thuật'),
  (11,'moon','ดวงจันทร์','月亮','mặt trăng'),
  (12,'star','ดาว','星星','ngôi sao'),
  (13,'mountain','ภูเขา','山','núi'),
  (14,'flower','ดอกไม้','花','hoa'),
  (15,'book','หนังสือ','书','sách'),
  (16,'key','กุญแจ','钥匙','chìa khóa');

INSERT INTO user_word_records (user_id, word, save_to_flashcard)
SELECT u.id,
  jsonb_build_object('vocabulary', w.term,
    'definition', jsonb_build_object('en', w.term, 'th', w.th, 'cn', w.cn, 'tw', w.cn, 'vi', w.vi)),
  true
FROM users u CROSS JOIN qa_words w
WHERE u.username IN ('qa-student-a3','qa-student-b1')
  AND NOT EXISTS (SELECT 1 FROM user_word_records x WHERE x.user_id = u.id);

-- 3. Sentence flashcards (user_sentence_records), 16 sentences with TH glosses.
CREATE TEMP TABLE qa_sentences (sn int, sentence text, th text);
INSERT INTO qa_sentences VALUES
  (1,'The bridge crosses the wide river.','สะพานข้ามแม่น้ำกว้าง'),
  (2,'A dragon sleeps inside the dark cave.','มังกรหลับอยู่ในถ้ำมืด'),
  (3,'The wizard holds a bright lantern.','พ่อมดถือโคมไฟสว่าง'),
  (4,'Magic stars shine above the castle.','ดาวเวทมนตร์ส่องแสงเหนือปราสาท'),
  (5,'The knight cleans his sharp sword.','อัศวินล้างดาบคมของเขา'),
  (6,'A red potion sits on the wooden table.','ยาสีแดงวางอยู่บนโต๊ะไม้'),
  (7,'The forest is quiet after the rain.','ป่าเงียบสงบหลังฝนตก'),
  (8,'The moon lights the old mountain path.','พระจันทร์ส่องทางบนภูเขาเก่า'),
  (9,'A small flower grows near the wall.','ดอกไม้เล็กเติบโตใกล้กำแพง'),
  (10,'The old book hides a golden key.','หนังสือเก่าซ่อนกุญแจทอง'),
  (11,'The river carries a small wooden boat.','แม่น้ำพาเรือไม้ลำเล็ก'),
  (12,'Wizards study magic every morning.','พ่อมดเรียนเวทมนตร์ทุกเช้า'),
  (13,'The castle gate opens at sunrise.','ประตูปราสาทเปิดตอนพระอาทิตย์ขึ้น'),
  (14,'A brave knight guards the stone tower.','อัศวินผู้กล้าเฝ้าหอคอยหิน'),
  (15,'The lantern floats into the night sky.','โคมไฟลอยขึ้นสู่ท้องฟ้ายามค่ำ'),
  (16,'Children read books under the big tree.','เด็กอ่านหนังสือใต้ต้นไม้ใหญ่');

INSERT INTO user_sentence_records
  (user_id, article_id, sentence, translation, sn, timepoint, end_timepoint, save_to_flashcard)
SELECT u.id,
  CASE u.username WHEN 'qa-student-a3' THEN (SELECT id FROM articles WHERE title='QA Game Content A')
                  ELSE (SELECT id FROM articles WHERE title='QA Game Content B') END,
  s.sentence, jsonb_build_object('en', s.sentence, 'th', s.th),
  s.sn, (s.sn - 1) * 3.0, s.sn * 3.0, true
FROM users u CROSS JOIN qa_sentences s
WHERE u.username IN ('qa-student-a3','qa-student-b1')
  AND NOT EXISTS (SELECT 1 FROM user_sentence_records x WHERE x.user_id = u.id);

SELECT u.username,
  (SELECT count(*) FROM user_word_records w WHERE w.user_id = u.id) AS words,
  (SELECT count(*) FROM user_sentence_records s WHERE s.user_id = u.id) AS sentences
FROM users u WHERE u.username IN ('qa-student-a3','qa-student-b1') ORDER BY 1;
