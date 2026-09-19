# Challenge migration review

Status: prepared and locally checked; host databases remain unchanged.

## Tenant relationship

The current schema references only `classrooms(id)` from `class_id`.
The classroom primary key supports this foreign key without another constraint.

The domain verifies tenant ownership through the tenant-scoped classroom query.
Student access also joins the classroom and user school identifiers explicitly.

A future composite `school_id, class_id` foreign key could add database protection.
That change would also require a matching classroom unique constraint and schema changes.
It is outside this migration because the current schema does not declare it.

## Additive SQL

Create the tables in definition, run, and contribution order.
Create each table's unique constraints before dependent foreign keys.

```sql
CREATE TABLE "game_challenge_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "created_by_user_id" text NOT NULL,
  "creation_key" uuid,
  "title" text NOT NULL,
  "game_id" text NOT NULL,
  "game_version" text NOT NULL,
  "content_mode" text NOT NULL,
  "content_locale" text NOT NULL,
  "content_json" jsonb NOT NULL,
  "seed" bigint NOT NULL,
  "difficulty" text NOT NULL,
  "modality_json" jsonb NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "target" integer NOT NULL,
  "teacher_participation_enabled" boolean NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "game_challenge_definitions_school_id_id_unique" UNIQUE("school_id", "id"),
  CONSTRAINT "game_challenge_definitions_creator_creation_key_unique" UNIQUE("school_id", "created_by_user_id", "creation_key"),
  CONSTRAINT "game_challenge_definitions_dates_check" CHECK ("starts_at" < "expires_at"),
  CONSTRAINT "game_challenge_definitions_seed_check" CHECK ("seed" BETWEEN 0 AND 9007199254740991),
  CONSTRAINT "game_challenge_definitions_target_check" CHECK ("target" BETWEEN 1 AND 1000000),
  CONSTRAINT "game_challenge_definitions_content_mode_check" CHECK ("content_mode" IN ('vocabulary', 'sentence')),
  CONSTRAINT "game_challenge_definitions_content_locale_check" CHECK ("content_locale" = 'th'),
  CONSTRAINT "game_challenge_definitions_difficulty_check" CHECK ("difficulty" IN ('easy', 'medium', 'hard', 'extreme')),
  CONSTRAINT "game_challenge_definitions_content_json_check" CHECK (jsonb_typeof("content_json") = 'object'),
  CONSTRAINT "game_challenge_definitions_modality_json_check" CHECK (jsonb_typeof("modality_json") = 'object')
);

CREATE TABLE "game_challenge_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "challenge_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "game_challenge_runs_owner_unique" UNIQUE("school_id", "id", "challenge_id", "user_id")
);

CREATE TABLE "game_challenge_contributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "challenge_id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "completion_id" uuid NOT NULL,
  "contributed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "game_challenge_contributions_school_completion_unique" UNIQUE("school_id", "completion_id"),
  CONSTRAINT "game_challenge_contributions_school_challenge_user_unique" UNIQUE("school_id", "challenge_id", "user_id")
);
```

Add foreign keys after all three tables exist:

```sql
ALTER TABLE "game_challenge_definitions" ADD CONSTRAINT "game_challenge_definitions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "game_challenge_definitions" ADD CONSTRAINT "game_challenge_definitions_class_id_classrooms_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "game_challenge_definitions" ADD CONSTRAINT "game_challenge_definitions_creator_fk" FOREIGN KEY ("school_id", "created_by_user_id") REFERENCES "public"."users"("school_id", "id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "game_challenge_runs" ADD CONSTRAINT "game_challenge_runs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "game_challenge_runs" ADD CONSTRAINT "game_challenge_runs_challenge_fk" FOREIGN KEY ("school_id", "challenge_id") REFERENCES "public"."game_challenge_definitions"("school_id", "id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "game_challenge_runs" ADD CONSTRAINT "game_challenge_runs_user_fk" FOREIGN KEY ("school_id", "user_id") REFERENCES "public"."users"("school_id", "id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "game_challenge_contributions" ADD CONSTRAINT "game_challenge_contributions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "game_challenge_contributions" ADD CONSTRAINT "game_challenge_contributions_run_fk" FOREIGN KEY ("school_id", "run_id", "challenge_id", "user_id") REFERENCES "public"."game_challenge_runs"("school_id", "id", "challenge_id", "user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "game_challenge_contributions" ADD CONSTRAINT "game_challenge_contributions_completion_fk" FOREIGN KEY ("school_id", "user_id", "completion_id") REFERENCES "public"."game_completions"("school_id", "user_id", "id") ON DELETE cascade ON UPDATE no action;
```

The schema declares direct `class_id → classrooms.id` and `school_id → schools.id` references.

Create the indexes last:

```sql
CREATE INDEX "game_challenge_definitions_school_class_window_idx" ON "game_challenge_definitions" USING btree ("school_id", "class_id", "starts_at", "expires_at");
CREATE INDEX "game_challenge_runs_school_challenge_user_idx" ON "game_challenge_runs" USING btree ("school_id", "challenge_id", "user_id");
CREATE INDEX "game_challenge_runs_expiry_idx" ON "game_challenge_runs" USING btree ("expires_at");
CREATE INDEX "game_challenge_contributions_school_challenge_idx" ON "game_challenge_contributions" USING btree ("school_id", "challenge_id", "contributed_at");
```

## Migration integration

Migration `0059_game_challenges.sql`, snapshot `0059_snapshot.json`, and journal entry 59 are prepared.
Two focused migration cases passed against the final repository artifacts.
One temporary PGlite database checked the new constraints with minimal prerequisite tables.
The snapshot integrity case confirmed that prior schema sections remain unchanged.

Migration `0028` already supplies `users(school_id, id)`.
Migration `0058` already supplies `game_completions(school_id, user_id, id)`.
The three challenge tables already have `FLAT` tenant registration.

Do not apply this migration until its generated snapshot matches the TypeScript schema.

## Creation retry key

The prepared migration now includes an optional creation key.
A unique constraint scopes each key to its school and creator.
Legacy requests can omit the key.
The migration remains unapplied to host databases.
