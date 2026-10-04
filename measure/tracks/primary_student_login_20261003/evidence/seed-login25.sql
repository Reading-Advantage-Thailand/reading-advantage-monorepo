-- Local QA only: 25 students in "QA Login Class" (school QA School A, teacher qa-teacher-a).
BEGIN;
INSERT INTO classrooms (name, school_id, teacher_id, grade, class_code)
SELECT 'QA Login Class', u.school_id, u.id, 3, 'QALOGIN25' FROM users u
WHERE u.username = 'qa-teacher-a' AND NOT EXISTS (SELECT 1 FROM classrooms WHERE class_code = 'QALOGIN25');
INSERT INTO classroom_teachers (classroom_id, teacher_id)
SELECT c.id, c.teacher_id FROM classrooms c WHERE c.class_code = 'QALOGIN25'
AND NOT EXISTS (SELECT 1 FROM classroom_teachers t WHERE t.classroom_id = c.id AND t.teacher_id = c.teacher_id);
INSERT INTO users (id, username, display_username, name, role, school_id)
SELECT gen_random_uuid()::text, 'qa-login-' || lpad(n::text, 2, '0'), 'qa-login-' || lpad(n::text, 2, '0'),
  (ARRAY['Ann','Bo','Chai','Dao','Earn','Fah','Gift','Ham','Ice','Jai','Kla','Lek','Mai','Nok','Oil','Pim','Ploy','Rak','Som','Tan','Um','View','Win','Yai','Zen'])[n],
  'STUDENT', (SELECT school_id FROM users WHERE username = 'qa-teacher-a')
FROM generate_series(1, 25) n
ON CONFLICT (username) DO NOTHING;
INSERT INTO classroom_students (classroom_id, student_id)
SELECT c.id, u.id FROM classrooms c, users u
WHERE c.class_code = 'QALOGIN25' AND u.username LIKE 'qa-login-%'
AND NOT EXISTS (SELECT 1 FROM classroom_students s WHERE s.classroom_id = c.id AND s.student_id = u.id);
COMMIT;
SELECT c.id, count(s.*) FROM classrooms c JOIN classroom_students s ON s.classroom_id = c.id WHERE c.class_code = 'QALOGIN25' GROUP BY c.id;
