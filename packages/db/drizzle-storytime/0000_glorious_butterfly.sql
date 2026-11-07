CREATE TABLE "storytime_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storytime_accounts_username_lower" CHECK (lower(username) = username),
	CONSTRAINT "storytime_accounts_role_check" CHECK (role IN ('family', 'class', 'teacher'))
);
--> statement-breakpoint
CREATE TABLE "storytime_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"account_id" uuid,
	"username" text,
	"reason" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storytime_login_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"window_start" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storytime_sessions" (
	"token_digest" text NOT NULL,
	"account_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_use_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storytime_sessions_token_digest_check" CHECK (token_digest ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "storytime_sessions" ADD CONSTRAINT "storytime_sessions_account_id_storytime_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."storytime_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "storytime_accounts_username_key" ON "storytime_accounts" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "storytime_sessions_token_digest_key" ON "storytime_sessions" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "storytime_sessions_account_created_idx" ON "storytime_sessions" USING btree ("account_id","created_at");
--> statement-breakpoint
CREATE FUNCTION storytime_audit_events_block_mutation() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'storytime_audit_events is append only';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER storytime_audit_events_immutable BEFORE UPDATE OR DELETE ON storytime_audit_events FOR EACH ROW EXECUTE FUNCTION storytime_audit_events_block_mutation();
