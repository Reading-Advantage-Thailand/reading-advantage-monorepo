CREATE TABLE "host_proof_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"transcript_digest" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text NOT NULL,
	"claim_id" uuid,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "host_proof_attempts_attempt_unique" UNIQUE("attempt_id")
);
--> statement-breakpoint
ALTER TABLE "host_proof_attempts" ADD CONSTRAINT "host_proof_attempts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_proof_attempts" ADD CONSTRAINT "host_proof_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "host_proof_attempts_school_user_idx" ON "host_proof_attempts" USING btree ("school_id","user_id");--> statement-breakpoint
CREATE INDEX "host_proof_attempts_expiry_idx" ON "host_proof_attempts" USING btree ("expires_at");