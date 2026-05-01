-- DropForeignKey
ALTER TABLE "classroomStudents" DROP CONSTRAINT "classroomStudents_classroom_id_fkey";

-- DropForeignKey
ALTER TABLE "classroomStudents" DROP CONSTRAINT "classroomStudents_student_id_fkey";

-- DropForeignKey
ALTER TABLE "classroomTeachers" DROP CONSTRAINT "classroomTeachers_classroom_id_fkey";

-- DropForeignKey
ALTER TABLE "classroomTeachers" DROP CONSTRAINT "classroomTeachers_teacher_id_fkey";

-- AddForeignKey
ALTER TABLE "classroomStudents" ADD CONSTRAINT "classroomStudents_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroomStudents" ADD CONSTRAINT "classroomStudents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroomTeachers" ADD CONSTRAINT "classroomTeachers_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroomTeachers" ADD CONSTRAINT "classroomTeachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
