CREATE TABLE "capability_idempotency_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "capability_id" text NOT NULL,
  "scope" text NOT NULL,
  "tenant_key" text NOT NULL,
  "key_fingerprint" text NOT NULL,
  "input_fingerprint" text NOT NULL,
  "state" text NOT NULL,
  "ownership_token" uuid,
  "output_json" jsonb,
  "error_json" jsonb,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "capability_idempotency_namespace_key_unique" UNIQUE("capability_id", "scope", "tenant_key", "key_fingerprint"),
  CONSTRAINT "capability_idempotency_ownership_token_unique" UNIQUE("ownership_token"),
  CONSTRAINT "capability_idempotency_scope_check" CHECK ("scope" IN ('tenant-capability', 'global-capability')),
  CONSTRAINT "capability_idempotency_state_check" CHECK ("state" IN ('owned', 'completed', 'retryable', 'terminal')),
  CONSTRAINT "capability_idempotency_owner_state_check" CHECK (("state" = 'owned' AND "ownership_token" IS NOT NULL AND "output_json" IS NULL AND "error_json" IS NULL) OR ("state" = 'completed' AND "ownership_token" IS NULL AND "output_json" IS NOT NULL AND "error_json" IS NULL) OR ("state" IN ('retryable', 'terminal') AND "ownership_token" IS NULL AND "output_json" IS NULL AND "error_json" IS NOT NULL)),
  CONSTRAINT "capability_idempotency_tenant_key_check" CHECK (("scope" = 'global-capability' AND "tenant_key" = '__global__') OR ("scope" = 'tenant-capability' AND "tenant_key" <> '__global__' AND length("tenant_key") > 0))
);
--> statement-breakpoint
CREATE INDEX "capability_idempotency_expiry_idx" ON "capability_idempotency_records" USING btree ("expires_at");
