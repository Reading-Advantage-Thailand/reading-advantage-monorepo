ALTER TABLE "accounts" ADD CONSTRAINT "accounts_provider_unique" UNIQUE("provider","provider_account_id");--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_unique" UNIQUE("identifier","token");--> statement-breakpoint
ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_unique" UNIQUE("classroom_id","student_id");--> statement-breakpoint
ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_unique" UNIQUE("assignment_id","student_id");--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_lesson_unique" UNIQUE("user_id","lesson_id");--> statement-breakpoint
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_unique" UNIQUE("user_id","question_id","question_type");