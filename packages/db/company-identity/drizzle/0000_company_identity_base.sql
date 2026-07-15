CREATE TYPE "public"."company_account_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."company_application_role_status" AS ENUM('ACTIVE', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."company_application_status" AS ENUM('ACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."company_audit_actor_type" AS ENUM('ACCOUNT', 'SERVICE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."company_audit_outcome" AS ENUM('SUCCEEDED', 'DENIED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."company_idempotency_state" AS ENUM('IN_PROGRESS', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."company_login_outcome" AS ENUM('SUCCEEDED', 'INVALID_CREDENTIALS', 'RATE_LIMITED', 'ACCOUNT_SUSPENDED', 'CLIENT_REJECTED');--> statement-breakpoint
CREATE TYPE "public"."company_membership_status" AS ENUM('ACTIVE', 'SUSPENDED', 'ENDED');--> statement-breakpoint
CREATE TYPE "public"."company_oidc_client_status" AS ENUM('ACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."company_oidc_client_type" AS ENUM('PUBLIC', 'CONFIDENTIAL');--> statement-breakpoint
CREATE TYPE "public"."company_oidc_pkce_method" AS ENUM('S256');--> statement-breakpoint
CREATE TYPE "public"."company_oidc_token_auth_method" AS ENUM('NONE', 'CLIENT_SECRET_BASIC');--> statement-breakpoint
CREATE TYPE "public"."company_organization_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."company_organization_type" AS ENUM('INTERNAL_COMPANY');--> statement-breakpoint
CREATE TYPE "public"."company_password_algorithm" AS ENUM('ARGON2ID', 'BCRYPT');--> statement-breakpoint
CREATE TYPE "public"."company_rate_limit_kind" AS ENUM('USERNAME', 'IP');--> statement-breakpoint
CREATE TYPE "public"."company_role_key" AS ENUM('EMPLOYEE', 'COMPANY_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."company_session_revoke_reason" AS ENUM('LOCAL_LOGOUT', 'GLOBAL_LOGOUT', 'ADMIN_REVOKE', 'ACCOUNT_SUSPENDED', 'CREDENTIAL_RESET', 'EXPIRED', 'SECURITY_EVENT');--> statement-breakpoint
CREATE TABLE "company_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(64) NOT NULL,
	"normalized_username" varchar(64) NOT NULL,
	"normalization_version" smallint DEFAULT 1 NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"status" "company_account_status" DEFAULT 'ACTIVE' NOT NULL,
	"auth_version" bigint DEFAULT 1 NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_accounts_normalization_version_check" CHECK ("company_accounts"."normalization_version" = 1),
	CONSTRAINT "company_accounts_normalized_username_format_check" CHECK ("company_accounts"."normalized_username" ~ '^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$'),
	CONSTRAINT "company_accounts_username_length_check" CHECK (char_length("company_accounts"."username") between 1 and 64),
	CONSTRAINT "company_accounts_display_name_length_check" CHECK (char_length("company_accounts"."display_name") between 1 and 200),
	CONSTRAINT "company_accounts_auth_version_check" CHECK ("company_accounts"."auth_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "company_application_role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"role_key" varchar(64) NOT NULL,
	"assigned_by_account_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "company_app_role_assignments_role_key_format_check" CHECK ("company_application_role_assignments"."role_key" ~ '^[A-Z][A-Z0-9_]{0,63}$'),
	CONSTRAINT "company_app_role_assignments_expiry_check" CHECK ("company_application_role_assignments"."expires_at" IS NULL OR "company_application_role_assignments"."expires_at" > "company_application_role_assignments"."assigned_at")
);
--> statement-breakpoint
CREATE TABLE "company_application_role_definitions" (
	"application_id" uuid NOT NULL,
	"role_key" varchar(64) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"status" "company_application_role_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_application_role_definitions_application_id_role_key_pk" PRIMARY KEY("application_id","role_key"),
	CONSTRAINT "company_application_role_definitions_role_key_format_check" CHECK ("company_application_role_definitions"."role_key" ~ '^[A-Z][A-Z0-9_]{0,63}$'),
	CONSTRAINT "company_application_role_definitions_display_name_length_check" CHECK (char_length("company_application_role_definitions"."display_name") between 1 and 200),
	CONSTRAINT "company_application_role_definitions_description_length_check" CHECK (char_length("company_application_role_definitions"."description") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "company_application_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" char(64) NOT NULL,
	"sso_session_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"account_auth_version" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" "company_session_revoke_reason",
	CONSTRAINT "company_application_sessions_scope_unique" UNIQUE("id","application_id","membership_id"),
	CONSTRAINT "company_application_sessions_token_hash_hex_check" CHECK ("company_application_sessions"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_application_sessions_expiry_check" CHECK ("company_application_sessions"."expires_at" > "company_application_sessions"."created_at"),
	CONSTRAINT "company_application_sessions_revocation_check" CHECK (("company_application_sessions"."revoked_at" IS NULL AND "company_application_sessions"."revoke_reason" IS NULL) OR ("company_application_sessions"."revoked_at" IS NOT NULL AND "company_application_sessions"."revoke_reason" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "company_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"stable_key" varchar(64) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"status" "company_application_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_applications_stable_key_format_check" CHECK ("company_applications"."stable_key" ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'),
	CONSTRAINT "company_applications_display_name_length_check" CHECK (char_length("company_applications"."display_name") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "company_identity_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"correlation_id" uuid NOT NULL,
	"actor_type" "company_audit_actor_type" NOT NULL,
	"actor_account_id" uuid,
	"actor_service_key" varchar(128),
	"organization_id" uuid,
	"application_id" uuid,
	"target_account_id" uuid,
	"operation" varchar(128) NOT NULL,
	"outcome" "company_audit_outcome" NOT NULL,
	"reason_code" varchar(128),
	"ip_hash" char(64),
	"user_agent_family" varchar(128),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "company_identity_audit_events_actor_check" CHECK (("company_identity_audit_events"."actor_type" = 'ACCOUNT' AND "company_identity_audit_events"."actor_account_id" IS NOT NULL AND "company_identity_audit_events"."actor_service_key" IS NULL) OR ("company_identity_audit_events"."actor_type" = 'SERVICE' AND "company_identity_audit_events"."actor_account_id" IS NULL AND "company_identity_audit_events"."actor_service_key" IS NOT NULL) OR ("company_identity_audit_events"."actor_type" = 'SYSTEM' AND "company_identity_audit_events"."actor_account_id" IS NULL AND "company_identity_audit_events"."actor_service_key" IS NULL)),
	CONSTRAINT "company_identity_audit_events_actor_service_key_length_check" CHECK ("company_identity_audit_events"."actor_service_key" IS NULL OR char_length("company_identity_audit_events"."actor_service_key") between 1 and 128),
	CONSTRAINT "company_identity_audit_events_ip_hash_hex_check" CHECK ("company_identity_audit_events"."ip_hash" IS NULL OR "company_identity_audit_events"."ip_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_identity_audit_events_metadata_allowed_keys_check" CHECK (jsonb_typeof("company_identity_audit_events"."metadata") = 'object' AND ("company_identity_audit_events"."metadata" - ARRAY['source', 'previousStatus', 'newStatus', 'roleKey', 'clientId', 'credentialAlgorithm', 'sessionCount', 'normalizationVersion', 'migrationRunId', 'sourcePrincipalId', 'sourceFingerprint', 'idempotencyReplay', 'expiresAt', 'reasonCategory']::text[]) = '{}'::jsonb),
	CONSTRAINT "company_identity_audit_events_operation_length_check" CHECK (char_length("company_identity_audit_events"."operation") between 1 and 128),
	CONSTRAINT "company_identity_audit_events_reason_code_length_check" CHECK ("company_identity_audit_events"."reason_code" IS NULL OR char_length("company_identity_audit_events"."reason_code") between 1 and 128),
	CONSTRAINT "company_identity_audit_events_user_agent_family_length_check" CHECK ("company_identity_audit_events"."user_agent_family" IS NULL OR char_length("company_identity_audit_events"."user_agent_family") between 1 and 128)
);
--> statement-breakpoint
CREATE TABLE "company_identity_idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation" varchar(128) NOT NULL,
	"scope_key" varchar(200) NOT NULL,
	"idempotency_key_hash" char(64) NOT NULL,
	"request_hash" char(64) NOT NULL,
	"state" "company_idempotency_state" DEFAULT 'IN_PROGRESS' NOT NULL,
	"owner_token_hash" char(64),
	"safe_result" jsonb,
	"safe_error_code" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "company_identity_idempotency_operation_scope_key_unique" UNIQUE("operation","scope_key","idempotency_key_hash"),
	CONSTRAINT "company_identity_idempotency_key_hash_hex_check" CHECK ("company_identity_idempotency_records"."idempotency_key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_identity_idempotency_request_hash_hex_check" CHECK ("company_identity_idempotency_records"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_identity_idempotency_owner_hash_hex_check" CHECK ("company_identity_idempotency_records"."owner_token_hash" IS NULL OR "company_identity_idempotency_records"."owner_token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_identity_idempotency_operation_length_check" CHECK (char_length("company_identity_idempotency_records"."operation") between 1 and 128),
	CONSTRAINT "company_identity_idempotency_scope_key_length_check" CHECK (char_length("company_identity_idempotency_records"."scope_key") between 1 and 200),
	CONSTRAINT "company_identity_idempotency_scope_key_format_check" CHECK ("company_identity_idempotency_records"."scope_key" ~ '^(global|organization:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|account:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$'),
	CONSTRAINT "company_identity_idempotency_safe_error_code_length_check" CHECK ("company_identity_idempotency_records"."safe_error_code" IS NULL OR char_length("company_identity_idempotency_records"."safe_error_code") between 1 and 128),
	CONSTRAINT "company_identity_idempotency_completed_time_check" CHECK ("company_identity_idempotency_records"."completed_at" IS NULL OR "company_identity_idempotency_records"."completed_at" >= "company_identity_idempotency_records"."created_at"),
	CONSTRAINT "company_identity_idempotency_expiry_check" CHECK ("company_identity_idempotency_records"."expires_at" > "company_identity_idempotency_records"."created_at"),
	CONSTRAINT "company_identity_idempotency_state_check" CHECK (("company_identity_idempotency_records"."state" = 'IN_PROGRESS' AND "company_identity_idempotency_records"."owner_token_hash" IS NOT NULL AND "company_identity_idempotency_records"."lease_expires_at" IS NOT NULL AND "company_identity_idempotency_records"."completed_at" IS NULL AND "company_identity_idempotency_records"."safe_result" IS NULL AND "company_identity_idempotency_records"."safe_error_code" IS NULL) OR ("company_identity_idempotency_records"."state" = 'SUCCEEDED' AND "company_identity_idempotency_records"."owner_token_hash" IS NULL AND "company_identity_idempotency_records"."lease_expires_at" IS NULL AND "company_identity_idempotency_records"."completed_at" IS NOT NULL AND "company_identity_idempotency_records"."safe_result" IS NOT NULL AND "company_identity_idempotency_records"."safe_error_code" IS NULL) OR ("company_identity_idempotency_records"."state" = 'FAILED' AND "company_identity_idempotency_records"."owner_token_hash" IS NULL AND "company_identity_idempotency_records"."lease_expires_at" IS NULL AND "company_identity_idempotency_records"."completed_at" IS NOT NULL AND "company_identity_idempotency_records"."safe_result" IS NULL AND "company_identity_idempotency_records"."safe_error_code" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "company_login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"correlation_id" uuid NOT NULL,
	"normalized_username_hash" char(64) NOT NULL,
	"ip_hash" char(64) NOT NULL,
	"oidc_client_id" uuid,
	"outcome" "company_login_outcome" NOT NULL,
	"account_id" uuid,
	"latency_ms" integer NOT NULL,
	CONSTRAINT "company_login_attempts_username_hash_hex_check" CHECK ("company_login_attempts"."normalized_username_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_login_attempts_ip_hash_hex_check" CHECK ("company_login_attempts"."ip_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_login_attempts_latency_check" CHECK ("company_login_attempts"."latency_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "company_login_rate_limit_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "company_rate_limit_kind" NOT NULL,
	"identifier_hash" char(64) NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone,
	"challenge_required_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_rate_limit_buckets_kind_identifier_unique" UNIQUE("kind","identifier_hash"),
	CONSTRAINT "company_rate_limit_buckets_identifier_hash_hex_check" CHECK ("company_login_rate_limit_buckets"."identifier_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_rate_limit_buckets_failed_count_check" CHECK ("company_login_rate_limit_buckets"."failed_count" >= 0),
	CONSTRAINT "company_rate_limit_buckets_last_attempt_check" CHECK ("company_login_rate_limit_buckets"."last_attempt_at" >= "company_login_rate_limit_buckets"."window_started_at"),
	CONSTRAINT "company_rate_limit_buckets_blocked_until_check" CHECK ("company_login_rate_limit_buckets"."blocked_until" IS NULL OR "company_login_rate_limit_buckets"."blocked_until" > "company_login_rate_limit_buckets"."window_started_at"),
	CONSTRAINT "company_rate_limit_buckets_challenge_required_at_check" CHECK ("company_login_rate_limit_buckets"."challenge_required_at" IS NULL OR "company_login_rate_limit_buckets"."challenge_required_at" >= "company_login_rate_limit_buckets"."window_started_at")
);
--> statement-breakpoint
CREATE TABLE "company_oidc_authorization_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" char(64) NOT NULL,
	"oidc_client_id" uuid NOT NULL,
	"redirect_uri_id" uuid NOT NULL,
	"sso_session_id" uuid NOT NULL,
	"code_challenge" varchar(128) NOT NULL,
	"code_challenge_method" "company_oidc_pkce_method" DEFAULT 'S256' NOT NULL,
	"nonce" varchar(255) NOT NULL,
	"scope" text[] DEFAULT ARRAY['openid']::text[] NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "company_oidc_authorization_codes_code_hash_hex_check" CHECK ("company_oidc_authorization_codes"."code_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_oidc_codes_expiry_check" CHECK ("company_oidc_authorization_codes"."issued_at" < "company_oidc_authorization_codes"."expires_at" AND "company_oidc_authorization_codes"."expires_at" <= "company_oidc_authorization_codes"."issued_at" + interval '5 minutes'),
	CONSTRAINT "company_oidc_codes_terminal_state_check" CHECK (NOT ("company_oidc_authorization_codes"."consumed_at" IS NOT NULL AND "company_oidc_authorization_codes"."revoked_at" IS NOT NULL)),
	CONSTRAINT "company_oidc_codes_consumed_time_check" CHECK ("company_oidc_authorization_codes"."consumed_at" IS NULL OR ("company_oidc_authorization_codes"."consumed_at" >= "company_oidc_authorization_codes"."issued_at" AND "company_oidc_authorization_codes"."consumed_at" < "company_oidc_authorization_codes"."expires_at")),
	CONSTRAINT "company_oidc_codes_pkce_challenge_format_check" CHECK ("company_oidc_authorization_codes"."code_challenge" ~ '^[A-Za-z0-9_-]{43}$'),
	CONSTRAINT "company_oidc_codes_nonce_length_check" CHECK (char_length("company_oidc_authorization_codes"."nonce") between 1 and 255)
);
--> statement-breakpoint
CREATE TABLE "company_oidc_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"client_id" varchar(128) NOT NULL,
	"client_type" "company_oidc_client_type" NOT NULL,
	"token_auth_method" "company_oidc_token_auth_method" NOT NULL,
	"client_secret_hash" text,
	"secret_version" bigint DEFAULT 1 NOT NULL,
	"pkce_required" boolean DEFAULT true NOT NULL,
	"status" "company_oidc_client_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_oidc_clients_application_client_unique" UNIQUE("application_id","client_id"),
	CONSTRAINT "company_oidc_clients_client_id_length_check" CHECK (char_length("company_oidc_clients"."client_id") between 1 and 128),
	CONSTRAINT "company_oidc_clients_auth_method_check" CHECK (("company_oidc_clients"."client_type" = 'PUBLIC' AND "company_oidc_clients"."token_auth_method" = 'NONE' AND "company_oidc_clients"."client_secret_hash" IS NULL) OR ("company_oidc_clients"."client_type" = 'CONFIDENTIAL' AND "company_oidc_clients"."token_auth_method" = 'CLIENT_SECRET_BASIC' AND "company_oidc_clients"."client_secret_hash" LIKE '$argon2id$%')),
	CONSTRAINT "company_oidc_clients_pkce_required_check" CHECK ("company_oidc_clients"."pkce_required" = true),
	CONSTRAINT "company_oidc_clients_secret_version_check" CHECK ("company_oidc_clients"."secret_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "company_oidc_redirect_uris" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oidc_client_id" uuid NOT NULL,
	"redirect_uri" varchar(2048) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_oidc_redirect_uris_client_uri_unique" UNIQUE("oidc_client_id","redirect_uri"),
	CONSTRAINT "company_oidc_redirect_uris_id_client_unique" UNIQUE("id","oidc_client_id"),
	CONSTRAINT "company_oidc_redirect_uris_length_check" CHECK (char_length("company_oidc_redirect_uris"."redirect_uri") between 1 and 2048)
);
--> statement-breakpoint
CREATE TABLE "company_organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"status" "company_membership_status" DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_memberships_organization_account_unique" UNIQUE("organization_id","account_id"),
	CONSTRAINT "company_memberships_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "company_memberships_ended_state_check" CHECK (("company_organization_memberships"."status" = 'ENDED' AND "company_organization_memberships"."ended_at" IS NOT NULL) OR ("company_organization_memberships"."status" <> 'ENDED' AND "company_organization_memberships"."ended_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "company_organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"stable_key" varchar(64) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"organization_type" "company_organization_type" DEFAULT 'INTERNAL_COMPANY' NOT NULL,
	"status" "company_organization_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_organizations_stable_key_format_check" CHECK ("company_organizations"."stable_key" ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'),
	CONSTRAINT "company_organizations_display_name_length_check" CHECK (char_length("company_organizations"."display_name") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "company_password_credentials" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"algorithm" "company_password_algorithm" NOT NULL,
	"credential_version" bigint DEFAULT 1 NOT NULL,
	"legacy_imported_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_password_credentials_version_check" CHECK ("company_password_credentials"."credential_version" >= 1),
	CONSTRAINT "company_password_credentials_hash_prefix_check" CHECK (("company_password_credentials"."algorithm" = 'ARGON2ID' AND "company_password_credentials"."password_hash" LIKE '$argon2id$%') OR ("company_password_credentials"."algorithm" = 'BCRYPT' AND "company_password_credentials"."password_hash" ~ '^\$2[aby]\$'))
);
--> statement-breakpoint
CREATE TABLE "company_role_assignments" (
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"role_key" "company_role_key" NOT NULL,
	"assigned_by_account_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_role_assignments_pkey" PRIMARY KEY("membership_id","role_key")
);
--> statement-breakpoint
CREATE TABLE "company_sso_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" char(64) NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"account_auth_version" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idle_expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" "company_session_revoke_reason",
	"ip_hash" char(64),
	"user_agent" varchar(512),
	CONSTRAINT "company_sso_sessions_membership_identity_unique" UNIQUE("id","organization_id","membership_id"),
	CONSTRAINT "company_sso_sessions_token_hash_hex_check" CHECK ("company_sso_sessions"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_sso_sessions_ip_hash_hex_check" CHECK ("company_sso_sessions"."ip_hash" IS NULL OR "company_sso_sessions"."ip_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "company_sso_sessions_expiry_order_check" CHECK ("company_sso_sessions"."created_at" < "company_sso_sessions"."idle_expires_at" AND "company_sso_sessions"."idle_expires_at" <= "company_sso_sessions"."absolute_expires_at"),
	CONSTRAINT "company_sso_sessions_revocation_check" CHECK (("company_sso_sessions"."revoked_at" IS NULL AND "company_sso_sessions"."revoke_reason" IS NULL) OR ("company_sso_sessions"."revoked_at" IS NOT NULL AND "company_sso_sessions"."revoke_reason" IS NOT NULL)),
	CONSTRAINT "company_sso_sessions_user_agent_length_check" CHECK ("company_sso_sessions"."user_agent" IS NULL OR char_length("company_sso_sessions"."user_agent") between 1 and 512)
);
--> statement-breakpoint
ALTER TABLE "company_application_role_assignments" ADD CONSTRAINT "company_app_role_assignments_membership_fk" FOREIGN KEY ("organization_id","membership_id") REFERENCES "public"."company_organization_memberships"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_application_role_assignments" ADD CONSTRAINT "company_app_role_assignments_role_definition_fk" FOREIGN KEY ("application_id","role_key") REFERENCES "public"."company_application_role_definitions"("application_id","role_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_application_role_assignments" ADD CONSTRAINT "company_app_role_assignments_assigned_by_fk" FOREIGN KEY ("assigned_by_account_id") REFERENCES "public"."company_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_application_role_definitions" ADD CONSTRAINT "company_application_role_definitions_application_fk" FOREIGN KEY ("application_id") REFERENCES "public"."company_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_application_sessions" ADD CONSTRAINT "company_application_sessions_sso_scope_fk" FOREIGN KEY ("sso_session_id","organization_id","membership_id") REFERENCES "public"."company_sso_sessions"("id","organization_id","membership_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_application_sessions" ADD CONSTRAINT "company_application_sessions_application_fk" FOREIGN KEY ("application_id") REFERENCES "public"."company_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_identity_audit_events" ADD CONSTRAINT "company_identity_audit_events_actor_account_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."company_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_identity_audit_events" ADD CONSTRAINT "company_identity_audit_events_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."company_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_identity_audit_events" ADD CONSTRAINT "company_identity_audit_events_application_fk" FOREIGN KEY ("application_id") REFERENCES "public"."company_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_identity_audit_events" ADD CONSTRAINT "company_identity_audit_events_target_account_fk" FOREIGN KEY ("target_account_id") REFERENCES "public"."company_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_login_attempts" ADD CONSTRAINT "company_login_attempts_oidc_client_fk" FOREIGN KEY ("oidc_client_id") REFERENCES "public"."company_oidc_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_login_attempts" ADD CONSTRAINT "company_login_attempts_account_fk" FOREIGN KEY ("account_id") REFERENCES "public"."company_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_oidc_authorization_codes" ADD CONSTRAINT "company_oidc_authorization_codes_client_fk" FOREIGN KEY ("oidc_client_id") REFERENCES "public"."company_oidc_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_oidc_authorization_codes" ADD CONSTRAINT "company_oidc_authorization_codes_redirect_client_fk" FOREIGN KEY ("redirect_uri_id","oidc_client_id") REFERENCES "public"."company_oidc_redirect_uris"("id","oidc_client_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_oidc_authorization_codes" ADD CONSTRAINT "company_oidc_authorization_codes_sso_session_fk" FOREIGN KEY ("sso_session_id") REFERENCES "public"."company_sso_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_oidc_clients" ADD CONSTRAINT "company_oidc_clients_application_fk" FOREIGN KEY ("application_id") REFERENCES "public"."company_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_oidc_redirect_uris" ADD CONSTRAINT "company_oidc_redirect_uris_client_fk" FOREIGN KEY ("oidc_client_id") REFERENCES "public"."company_oidc_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_organization_memberships" ADD CONSTRAINT "company_organization_memberships_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."company_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_organization_memberships" ADD CONSTRAINT "company_organization_memberships_account_fk" FOREIGN KEY ("account_id") REFERENCES "public"."company_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_password_credentials" ADD CONSTRAINT "company_password_credentials_account_fk" FOREIGN KEY ("account_id") REFERENCES "public"."company_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_role_assignments" ADD CONSTRAINT "company_role_assignments_membership_fk" FOREIGN KEY ("organization_id","membership_id") REFERENCES "public"."company_organization_memberships"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_role_assignments" ADD CONSTRAINT "company_role_assignments_assigned_by_fk" FOREIGN KEY ("assigned_by_account_id") REFERENCES "public"."company_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_sso_sessions" ADD CONSTRAINT "company_sso_sessions_membership_fk" FOREIGN KEY ("organization_id","membership_id") REFERENCES "public"."company_organization_memberships"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_accounts_normalized_username_unique" ON "company_accounts" USING btree ("normalized_username");--> statement-breakpoint
CREATE INDEX "company_accounts_status_idx" ON "company_accounts" USING btree ("status","id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_app_role_assignments_membership_app_role_unique" ON "company_application_role_assignments" USING btree ("membership_id","application_id","role_key");--> statement-breakpoint
CREATE INDEX "company_app_role_assignments_app_membership_idx" ON "company_application_role_assignments" USING btree ("application_id","membership_id");--> statement-breakpoint
CREATE INDEX "company_app_role_assignments_expiry_idx" ON "company_application_role_assignments" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_application_sessions_token_hash_unique" ON "company_application_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "company_application_sessions_application_membership_revoked_idx" ON "company_application_sessions" USING btree ("application_id","membership_id","revoked_at");--> statement-breakpoint
CREATE INDEX "company_application_sessions_sso_session_idx" ON "company_application_sessions" USING btree ("sso_session_id");--> statement-breakpoint
CREATE INDEX "company_application_sessions_expiry_idx" ON "company_application_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_applications_stable_key_unique" ON "company_applications" USING btree ("stable_key");--> statement-breakpoint
CREATE INDEX "company_identity_audit_events_occurred_at_idx" ON "company_identity_audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "company_identity_audit_events_actor_occurred_idx" ON "company_identity_audit_events" USING btree ("actor_account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "company_identity_audit_events_operation_occurred_idx" ON "company_identity_audit_events" USING btree ("operation","occurred_at");--> statement-breakpoint
CREATE INDEX "company_identity_audit_events_target_occurred_idx" ON "company_identity_audit_events" USING btree ("target_account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "company_identity_audit_events_correlation_idx" ON "company_identity_audit_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "company_identity_idempotency_expires_idx" ON "company_identity_idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "company_login_attempts_occurred_at_idx" ON "company_login_attempts" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "company_login_attempts_username_occurred_idx" ON "company_login_attempts" USING btree ("normalized_username_hash","occurred_at");--> statement-breakpoint
CREATE INDEX "company_login_attempts_ip_occurred_idx" ON "company_login_attempts" USING btree ("ip_hash","occurred_at");--> statement-breakpoint
CREATE INDEX "company_login_attempts_outcome_occurred_idx" ON "company_login_attempts" USING btree ("outcome","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_oidc_authorization_codes_code_hash_unique" ON "company_oidc_authorization_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "company_oidc_codes_client_expiry_idx" ON "company_oidc_authorization_codes" USING btree ("oidc_client_id","expires_at");--> statement-breakpoint
CREATE INDEX "company_oidc_codes_session_idx" ON "company_oidc_authorization_codes" USING btree ("sso_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_oidc_clients_client_id_unique" ON "company_oidc_clients" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "company_memberships_account_status_idx" ON "company_organization_memberships" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "company_memberships_organization_status_idx" ON "company_organization_memberships" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "company_organizations_stable_key_unique" ON "company_organizations" USING btree ("stable_key");--> statement-breakpoint
CREATE UNIQUE INDEX "company_sso_sessions_token_hash_unique" ON "company_sso_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "company_sso_sessions_membership_revoked_idx" ON "company_sso_sessions" USING btree ("membership_id","revoked_at");--> statement-breakpoint
CREATE INDEX "company_sso_sessions_absolute_expiry_idx" ON "company_sso_sessions" USING btree ("absolute_expires_at");--> statement-breakpoint
CREATE INDEX "company_sso_sessions_idle_expiry_idx" ON "company_sso_sessions" USING btree ("idle_expires_at");
