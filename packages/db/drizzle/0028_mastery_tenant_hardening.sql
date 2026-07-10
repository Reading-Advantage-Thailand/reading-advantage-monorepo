-- Phase S3 remediation: fail-closed tenant ownership and natural-key hardening.
-- This migration intentionally does not repair, delete, or reassign existing
-- mastery data. Any invalid ownership must be investigated before deployment.

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "mastery_cards" record
		LEFT JOIN "users" owner ON owner."school_id" = record."school_id" AND owner."id" = record."student_id"
		WHERE owner."id" IS NULL
		UNION ALL
		SELECT 1 FROM "mastery_reviews" record
		LEFT JOIN "users" owner ON owner."school_id" = record."school_id" AND owner."id" = record."student_id"
		WHERE owner."id" IS NULL
		UNION ALL
		SELECT 1 FROM "mastery_evidence" record
		LEFT JOIN "users" owner ON owner."school_id" = record."school_id" AND owner."id" = record."student_id"
		WHERE owner."id" IS NULL
		UNION ALL
		SELECT 1 FROM "mastery_states" record
		LEFT JOIN "users" owner ON owner."school_id" = record."school_id" AND owner."id" = record."student_id"
		WHERE owner."id" IS NULL
		UNION ALL
		SELECT 1 FROM "mastery_placements" record
		LEFT JOIN "users" owner ON owner."school_id" = record."school_id" AND owner."id" = record."student_id"
		WHERE owner."id" IS NULL
		UNION ALL
		SELECT 1 FROM "mastery_commits" record
		LEFT JOIN "users" owner ON owner."school_id" = record."school_id" AND owner."id" = record."student_id"
		WHERE owner."id" IS NULL
	) THEN
		RAISE EXCEPTION '0028 mastery tenant hardening blocked: cross-school or missing student owner exists';
	END IF;

	IF EXISTS (
		SELECT 1 FROM "mastery_reviews" review
		LEFT JOIN "mastery_cards" card
			ON card."school_id" = review."school_id"
			AND card."id" = review."card_id"
			AND card."student_id" = review."student_id"
		WHERE card."id" IS NULL
		UNION ALL
		SELECT 1 FROM "mastery_evidence" evidence
		LEFT JOIN "mastery_reviews" review
			ON review."school_id" = evidence."school_id"
			AND review."id" = evidence."review_id"
			AND review."student_id" = evidence."student_id"
		WHERE review."id" IS NULL
	) THEN
		RAISE EXCEPTION '0028 mastery tenant hardening blocked: card-review-evidence owner chain is inconsistent';
	END IF;

	IF EXISTS (
		SELECT 1 FROM "mastery_placements"
		GROUP BY "school_id", "student_id", "objective_id", "graph_release", "evidence_type"
		HAVING COUNT(*) > 1
		UNION ALL
		SELECT 1 FROM "mastery_calibrations"
		GROUP BY "school_id", "domain", "age_band", "params_version"
		HAVING COUNT(*) > 1
	) THEN
		RAISE EXCEPTION '0028 mastery tenant hardening blocked: duplicate placement or calibration natural key exists';
	END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "users" ADD CONSTRAINT "users_school_id_id_unique" UNIQUE("school_id", "id");
--> statement-breakpoint
ALTER TABLE "mastery_cards" ADD CONSTRAINT "mastery_cards_school_id_student_id_unique" UNIQUE("school_id", "id", "student_id");
--> statement-breakpoint
ALTER TABLE "mastery_reviews" ADD CONSTRAINT "mastery_reviews_school_id_student_id_unique" UNIQUE("school_id", "id", "student_id");
--> statement-breakpoint
ALTER TABLE "mastery_placements" ADD CONSTRAINT "mastery_placements_school_student_objective_release_type_unique" UNIQUE("school_id", "student_id", "objective_id", "graph_release", "evidence_type");
--> statement-breakpoint
ALTER TABLE "mastery_calibrations" ADD CONSTRAINT "mastery_calibrations_school_population_version_unique" UNIQUE("school_id", "domain", "age_band", "params_version");
--> statement-breakpoint

ALTER TABLE "mastery_cards" ADD CONSTRAINT "mastery_cards_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."users"("school_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "mastery_commits" ADD CONSTRAINT "mastery_commits_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."users"("school_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "mastery_evidence" ADD CONSTRAINT "mastery_evidence_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."users"("school_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "mastery_placements" ADD CONSTRAINT "mastery_placements_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."users"("school_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "mastery_reviews" ADD CONSTRAINT "mastery_reviews_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."users"("school_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "mastery_states" ADD CONSTRAINT "mastery_states_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."users"("school_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "mastery_reviews" ADD CONSTRAINT "mastery_reviews_school_card_student_fk" FOREIGN KEY ("school_id", "card_id", "student_id") REFERENCES "public"."mastery_cards"("school_id", "id", "student_id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "mastery_evidence" ADD CONSTRAINT "mastery_evidence_school_review_student_fk" FOREIGN KEY ("school_id", "review_id", "student_id") REFERENCES "public"."mastery_reviews"("school_id", "id", "student_id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "mastery_cards" DROP CONSTRAINT "mastery_cards_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "mastery_commits" DROP CONSTRAINT "mastery_commits_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "mastery_evidence" DROP CONSTRAINT "mastery_evidence_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "mastery_evidence" DROP CONSTRAINT "mastery_evidence_school_review_fk";
--> statement-breakpoint
ALTER TABLE "mastery_placements" DROP CONSTRAINT "mastery_placements_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "mastery_reviews" DROP CONSTRAINT "mastery_reviews_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "mastery_reviews" DROP CONSTRAINT "mastery_reviews_school_card_fk";
--> statement-breakpoint
ALTER TABLE "mastery_states" DROP CONSTRAINT "mastery_states_student_id_users_id_fk";
