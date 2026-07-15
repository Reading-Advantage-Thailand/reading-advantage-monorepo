import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Stable lifecycle values for an employee account. */
export const companyAccountStatusEnum = pgEnum("company_account_status", [
  "ACTIVE",
  "SUSPENDED",
]);

/** Supported first-party and migrated password hash algorithms. */
export const companyPasswordAlgorithmEnum = pgEnum(
  "company_password_algorithm",
  ["ARGON2ID", "BCRYPT"],
);

/** Organization kinds admitted by the internal employee identity boundary. */
export const companyOrganizationTypeEnum = pgEnum("company_organization_type", [
  "INTERNAL_COMPANY",
]);

/** Lifecycle values for an internal company organization. */
export const companyOrganizationStatusEnum = pgEnum(
  "company_organization_status",
  ["ACTIVE", "SUSPENDED"],
);

/** Lifecycle values for an employee's company membership. */
export const companyMembershipStatusEnum = pgEnum("company_membership_status", [
  "ACTIVE",
  "SUSPENDED",
  "ENDED",
]);

/** Additive roles that grant company identity administration authority. */
export const companyRoleKeyEnum = pgEnum("company_role_key", [
  "EMPLOYEE",
  "COMPANY_ADMIN",
]);

/** Lifecycle values for a registered employee application. */
export const companyApplicationStatusEnum = pgEnum(
  "company_application_status",
  ["ACTIVE", "DISABLED"],
);

/** Lifecycle values for application-local role definitions. */
export const companyApplicationRoleStatusEnum = pgEnum(
  "company_application_role_status",
  ["ACTIVE", "RETIRED"],
);

/** Auditable reasons that an SSO or application session became revoked. */
export const companySessionRevokeReasonEnum = pgEnum(
  "company_session_revoke_reason",
  [
    "LOCAL_LOGOUT",
    "GLOBAL_LOGOUT",
    "ADMIN_REVOKE",
    "ACCOUNT_SUSPENDED",
    "CREDENTIAL_RESET",
    "EXPIRED",
    "SECURITY_EVENT",
  ],
);

/** OIDC client confidentiality modes. */
export const companyOidcClientTypeEnum = pgEnum("company_oidc_client_type", [
  "PUBLIC",
  "CONFIDENTIAL",
]);

/** Lifecycle values for an OIDC client registration. */
export const companyOidcClientStatusEnum = pgEnum(
  "company_oidc_client_status",
  ["ACTIVE", "DISABLED"],
);

/** Supported OIDC token endpoint client-authentication methods. */
export const companyOidcTokenAuthMethodEnum = pgEnum(
  "company_oidc_token_auth_method",
  ["NONE", "CLIENT_SECRET_BASIC"],
);

/** The only PKCE transformation admitted by the identity issuer. */
export const companyOidcPkceMethodEnum = pgEnum("company_oidc_pkce_method", [
  "S256",
]);

/** Actor categories recorded in immutable identity audit events. */
export const companyAuditActorTypeEnum = pgEnum("company_audit_actor_type", [
  "ACCOUNT",
  "SERVICE",
  "SYSTEM",
]);

/** Outcomes recorded for security-sensitive identity operations. */
export const companyAuditOutcomeEnum = pgEnum("company_audit_outcome", [
  "SUCCEEDED",
  "DENIED",
  "FAILED",
]);

/** Non-enumerating result categories retained for login attempts. */
export const companyLoginOutcomeEnum = pgEnum("company_login_outcome", [
  "SUCCEEDED",
  "INVALID_CREDENTIALS",
  "RATE_LIMITED",
  "ACCOUNT_SUSPENDED",
  "CLIENT_REJECTED",
]);

/** Independent login rate-limit dimensions. */
export const companyRateLimitKindEnum = pgEnum("company_rate_limit_kind", [
  "USERNAME",
  "IP",
]);

/** Durable acquisition and terminal states for idempotent operations. */
export const companyIdempotencyStateEnum = pgEnum("company_idempotency_state", [
  "IN_PROGRESS",
  "SUCCEEDED",
  "FAILED",
]);

/** Employee identity accounts, excluding school and product profile data. */
export const companyAccounts = pgTable(
  "company_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 64 }).notNull(),
    normalizedUsername: varchar("normalized_username", {
      length: 64,
    }).notNull(),
    normalizationVersion: smallint("normalization_version")
      .default(1)
      .notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    status: companyAccountStatusEnum("status").default("ACTIVE").notNull(),
    authVersion: bigint("auth_version", { mode: "number" })
      .default(1)
      .notNull(),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("company_accounts_normalized_username_unique").on(
      table.normalizedUsername,
    ),
    check(
      "company_accounts_normalization_version_check",
      sql`${table.normalizationVersion} = 1`,
    ),
    check(
      "company_accounts_normalized_username_format_check",
      sql`${table.normalizedUsername} ~ '^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$'`,
    ),
    check(
      "company_accounts_username_length_check",
      sql`char_length(${table.username}) between 1 and 64`,
    ),
    check(
      "company_accounts_display_name_length_check",
      sql`char_length(${table.displayName}) between 1 and 200`,
    ),
    check(
      "company_accounts_auth_version_check",
      sql`${table.authVersion} >= 1`,
    ),
    index("company_accounts_status_idx").on(table.status, table.id),
  ],
);

/** One first-party password credential for each company account. */
export const companyPasswordCredentials = pgTable(
  "company_password_credentials",
  {
    accountId: uuid("account_id").primaryKey(),
    passwordHash: text("password_hash").notNull(),
    algorithm: companyPasswordAlgorithmEnum("algorithm").notNull(),
    credentialVersion: bigint("credential_version", { mode: "number" })
      .default(1)
      .notNull(),
    legacyImportedAt: timestamp("legacy_imported_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "company_password_credentials_account_fk",
      columns: [table.accountId],
      foreignColumns: [companyAccounts.id],
    }).onDelete("restrict"),
    check(
      "company_password_credentials_version_check",
      sql`${table.credentialVersion} >= 1`,
    ),
    check(
      "company_password_credentials_hash_prefix_check",
      sql`(${table.algorithm} = 'ARGON2ID' AND ${table.passwordHash} LIKE '$argon2id$%') OR (${table.algorithm} = 'BCRYPT' AND ${table.passwordHash} ~ '^\\$2[aby]\\$')`,
    ),
  ],
);

/** Stable internal-company organizations that own employee memberships. */
export const companyOrganizations = pgTable(
  "company_organizations",
  {
    id: uuid("id").primaryKey(),
    stableKey: varchar("stable_key", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    organizationType: companyOrganizationTypeEnum("organization_type")
      .default("INTERNAL_COMPANY")
      .notNull(),
    status: companyOrganizationStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("company_organizations_stable_key_unique").on(table.stableKey),
    check(
      "company_organizations_stable_key_format_check",
      sql`${table.stableKey} ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'`,
    ),
    check(
      "company_organizations_display_name_length_check",
      sql`char_length(${table.displayName}) between 1 and 200`,
    ),
  ],
);

/** Employee memberships that anchor company and application authority. */
export const companyOrganizationMemberships = pgTable(
  "company_organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    accountId: uuid("account_id").notNull(),
    status: companyMembershipStatusEnum("status").default("ACTIVE").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "company_organization_memberships_organization_fk",
      columns: [table.organizationId],
      foreignColumns: [companyOrganizations.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_organization_memberships_account_fk",
      columns: [table.accountId],
      foreignColumns: [companyAccounts.id],
    }).onDelete("restrict"),
    unique("company_memberships_organization_account_unique").on(
      table.organizationId,
      table.accountId,
    ),
    unique("company_memberships_organization_id_id_unique").on(
      table.organizationId,
      table.id,
    ),
    check(
      "company_memberships_ended_state_check",
      sql`(${table.status} = 'ENDED' AND ${table.endedAt} IS NOT NULL) OR (${table.status} <> 'ENDED' AND ${table.endedAt} IS NULL)`,
    ),
    index("company_memberships_account_status_idx").on(
      table.accountId,
      table.status,
    ),
    index("company_memberships_organization_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

/** Additive company-level role assignments scoped by active membership. */
export const companyRoleAssignments = pgTable(
  "company_role_assignments",
  {
    organizationId: uuid("organization_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    roleKey: companyRoleKeyEnum("role_key").notNull(),
    assignedByAccountId: uuid("assigned_by_account_id"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "company_role_assignments_pkey",
      columns: [table.membershipId, table.roleKey],
    }),
    foreignKey({
      name: "company_role_assignments_membership_fk",
      columns: [table.organizationId, table.membershipId],
      foreignColumns: [
        companyOrganizationMemberships.organizationId,
        companyOrganizationMemberships.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_role_assignments_assigned_by_fk",
      columns: [table.assignedByAccountId],
      foreignColumns: [companyAccounts.id],
    }).onDelete("restrict"),
  ],
);

/** Registry of independently deployed employee-facing applications. */
export const companyApplications = pgTable(
  "company_applications",
  {
    id: uuid("id").primaryKey(),
    stableKey: varchar("stable_key", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    status: companyApplicationStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("company_applications_stable_key_unique").on(table.stableKey),
    check(
      "company_applications_stable_key_format_check",
      sql`${table.stableKey} ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'`,
    ),
    check(
      "company_applications_display_name_length_check",
      sql`char_length(${table.displayName}) between 1 and 200`,
    ),
  ],
);

/** Named, application-local roles that do not imply company authority. */
export const companyApplicationRoleDefinitions = pgTable(
  "company_application_role_definitions",
  {
    applicationId: uuid("application_id").notNull(),
    roleKey: varchar("role_key", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    description: text("description").notNull(),
    status: companyApplicationRoleStatusEnum("status")
      .default("ACTIVE")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.applicationId, table.roleKey] }),
    foreignKey({
      name: "company_application_role_definitions_application_fk",
      columns: [table.applicationId],
      foreignColumns: [companyApplications.id],
    }).onDelete("restrict"),
    check(
      "company_application_role_definitions_role_key_format_check",
      sql`${table.roleKey} ~ '^[A-Z][A-Z0-9_]{0,63}$'`,
    ),
    check(
      "company_application_role_definitions_display_name_length_check",
      sql`char_length(${table.displayName}) between 1 and 200`,
    ),
    check(
      "company_application_role_definitions_description_length_check",
      sql`char_length(${table.description}) between 1 and 2000`,
    ),
  ],
);

/** Membership-anchored grants within one application's role namespace. */
export const companyApplicationRoleAssignments = pgTable(
  "company_application_role_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    applicationId: uuid("application_id").notNull(),
    roleKey: varchar("role_key", { length: 64 }).notNull(),
    assignedByAccountId: uuid("assigned_by_account_id"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "company_app_role_assignments_membership_fk",
      columns: [table.organizationId, table.membershipId],
      foreignColumns: [
        companyOrganizationMemberships.organizationId,
        companyOrganizationMemberships.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_app_role_assignments_role_definition_fk",
      columns: [table.applicationId, table.roleKey],
      foreignColumns: [
        companyApplicationRoleDefinitions.applicationId,
        companyApplicationRoleDefinitions.roleKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_app_role_assignments_assigned_by_fk",
      columns: [table.assignedByAccountId],
      foreignColumns: [companyAccounts.id],
    }).onDelete("restrict"),
    uniqueIndex("company_app_role_assignments_membership_app_role_unique").on(
      table.membershipId,
      table.applicationId,
      table.roleKey,
    ),
    check(
      "company_app_role_assignments_role_key_format_check",
      sql`${table.roleKey} ~ '^[A-Z][A-Z0-9_]{0,63}$'`,
    ),
    check(
      "company_app_role_assignments_expiry_check",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} > ${table.assignedAt}`,
    ),
    index("company_app_role_assignments_app_membership_idx").on(
      table.applicationId,
      table.membershipId,
    ),
    index("company_app_role_assignments_expiry_idx").on(table.expiresAt),
  ],
);

/** Hash-only Accounts SSO sessions anchored to an employee membership. */
export const companySsoSessions = pgTable(
  "company_sso_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    organizationId: uuid("organization_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    accountAuthVersion: bigint("account_auth_version", {
      mode: "number",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    idleExpiresAt: timestamp("idle_expires_at", {
      withTimezone: true,
    }).notNull(),
    absoluteExpiresAt: timestamp("absolute_expires_at", {
      withTimezone: true,
    }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: companySessionRevokeReasonEnum("revoke_reason"),
    ipHash: char("ip_hash", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
  },
  (table) => [
    foreignKey({
      name: "company_sso_sessions_membership_fk",
      columns: [table.organizationId, table.membershipId],
      foreignColumns: [
        companyOrganizationMemberships.organizationId,
        companyOrganizationMemberships.id,
      ],
    }).onDelete("restrict"),
    unique("company_sso_sessions_membership_identity_unique").on(
      table.id,
      table.organizationId,
      table.membershipId,
    ),
    uniqueIndex("company_sso_sessions_token_hash_unique").on(table.tokenHash),
    check(
      "company_sso_sessions_token_hash_hex_check",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_sso_sessions_ip_hash_hex_check",
      sql`${table.ipHash} IS NULL OR ${table.ipHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_sso_sessions_expiry_order_check",
      sql`${table.createdAt} < ${table.idleExpiresAt} AND ${table.idleExpiresAt} <= ${table.absoluteExpiresAt}`,
    ),
    check(
      "company_sso_sessions_revocation_check",
      sql`(${table.revokedAt} IS NULL AND ${table.revokeReason} IS NULL) OR (${table.revokedAt} IS NOT NULL AND ${table.revokeReason} IS NOT NULL)`,
    ),
    check(
      "company_sso_sessions_user_agent_length_check",
      sql`${table.userAgent} IS NULL OR char_length(${table.userAgent}) between 1 and 512`,
    ),
    index("company_sso_sessions_membership_revoked_idx").on(
      table.membershipId,
      table.revokedAt,
    ),
    index("company_sso_sessions_absolute_expiry_idx").on(
      table.absoluteExpiresAt,
    ),
    index("company_sso_sessions_idle_expiry_idx").on(table.idleExpiresAt),
  ],
);

/** Short-lived application sessions derived from a live Accounts SSO session. */
export const companyApplicationSessions = pgTable(
  "company_application_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    ssoSessionId: uuid("sso_session_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    applicationId: uuid("application_id").notNull(),
    accountAuthVersion: bigint("account_auth_version", {
      mode: "number",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: companySessionRevokeReasonEnum("revoke_reason"),
  },
  (table) => [
    foreignKey({
      name: "company_application_sessions_sso_scope_fk",
      columns: [table.ssoSessionId, table.organizationId, table.membershipId],
      foreignColumns: [
        companySsoSessions.id,
        companySsoSessions.organizationId,
        companySsoSessions.membershipId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "company_application_sessions_application_fk",
      columns: [table.applicationId],
      foreignColumns: [companyApplications.id],
    }).onDelete("restrict"),
    unique("company_application_sessions_scope_unique").on(
      table.id,
      table.applicationId,
      table.membershipId,
    ),
    uniqueIndex("company_application_sessions_token_hash_unique").on(
      table.tokenHash,
    ),
    check(
      "company_application_sessions_token_hash_hex_check",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_application_sessions_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "company_application_sessions_revocation_check",
      sql`(${table.revokedAt} IS NULL AND ${table.revokeReason} IS NULL) OR (${table.revokedAt} IS NOT NULL AND ${table.revokeReason} IS NOT NULL)`,
    ),
    index("company_application_sessions_application_membership_revoked_idx").on(
      table.applicationId,
      table.membershipId,
      table.revokedAt,
    ),
    index("company_application_sessions_sso_session_idx").on(
      table.ssoSessionId,
    ),
    index("company_application_sessions_expiry_idx").on(table.expiresAt),
  ],
);

/** Explicit OIDC client registrations mapped to one company application. */
export const companyOidcClients = pgTable(
  "company_oidc_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").notNull(),
    clientId: varchar("client_id", { length: 128 }).notNull(),
    clientType: companyOidcClientTypeEnum("client_type").notNull(),
    tokenAuthMethod:
      companyOidcTokenAuthMethodEnum("token_auth_method").notNull(),
    clientSecretHash: text("client_secret_hash"),
    secretVersion: bigint("secret_version", { mode: "number" })
      .default(1)
      .notNull(),
    pkceRequired: boolean("pkce_required").default(true).notNull(),
    status: companyOidcClientStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "company_oidc_clients_application_fk",
      columns: [table.applicationId],
      foreignColumns: [companyApplications.id],
    }).onDelete("restrict"),
    uniqueIndex("company_oidc_clients_client_id_unique").on(table.clientId),
    unique("company_oidc_clients_application_client_unique").on(
      table.applicationId,
      table.clientId,
    ),
    check(
      "company_oidc_clients_client_id_length_check",
      sql`char_length(${table.clientId}) between 1 and 128`,
    ),
    check(
      "company_oidc_clients_auth_method_check",
      sql`(${table.clientType} = 'PUBLIC' AND ${table.tokenAuthMethod} = 'NONE' AND ${table.clientSecretHash} IS NULL) OR (${table.clientType} = 'CONFIDENTIAL' AND ${table.tokenAuthMethod} = 'CLIENT_SECRET_BASIC' AND ${table.clientSecretHash} LIKE '$argon2id$%')`,
    ),
    check(
      "company_oidc_clients_pkce_required_check",
      sql`${table.pkceRequired} = true`,
    ),
    check(
      "company_oidc_clients_secret_version_check",
      sql`${table.secretVersion} >= 1`,
    ),
  ],
);

/** Exact callback URI registrations for a single OIDC client. */
export const companyOidcRedirectUris = pgTable(
  "company_oidc_redirect_uris",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    oidcClientId: uuid("oidc_client_id").notNull(),
    redirectUri: varchar("redirect_uri", { length: 2048 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "company_oidc_redirect_uris_client_fk",
      columns: [table.oidcClientId],
      foreignColumns: [companyOidcClients.id],
    }).onDelete("cascade"),
    unique("company_oidc_redirect_uris_client_uri_unique").on(
      table.oidcClientId,
      table.redirectUri,
    ),
    unique("company_oidc_redirect_uris_id_client_unique").on(
      table.id,
      table.oidcClientId,
    ),
    check(
      "company_oidc_redirect_uris_length_check",
      sql`char_length(${table.redirectUri}) between 1 and 2048`,
    ),
  ],
);

/** One-time hash-only OIDC authorization codes bound to PKCE and a callback. */
export const companyOidcAuthorizationCodes = pgTable(
  "company_oidc_authorization_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeHash: char("code_hash", { length: 64 }).notNull(),
    oidcClientId: uuid("oidc_client_id").notNull(),
    redirectUriId: uuid("redirect_uri_id").notNull(),
    ssoSessionId: uuid("sso_session_id").notNull(),
    codeChallenge: varchar("code_challenge", { length: 128 }).notNull(),
    codeChallengeMethod: companyOidcPkceMethodEnum("code_challenge_method")
      .default("S256")
      .notNull(),
    nonce: varchar("nonce", { length: 255 }).notNull(),
    scope: text("scope")
      .array()
      .default(sql`ARRAY['openid']::text[]`)
      .notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "company_oidc_authorization_codes_client_fk",
      columns: [table.oidcClientId],
      foreignColumns: [companyOidcClients.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_oidc_authorization_codes_redirect_client_fk",
      columns: [table.redirectUriId, table.oidcClientId],
      foreignColumns: [
        companyOidcRedirectUris.id,
        companyOidcRedirectUris.oidcClientId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_oidc_authorization_codes_sso_session_fk",
      columns: [table.ssoSessionId],
      foreignColumns: [companySsoSessions.id],
    }).onDelete("cascade"),
    uniqueIndex("company_oidc_authorization_codes_code_hash_unique").on(
      table.codeHash,
    ),
    check(
      "company_oidc_authorization_codes_code_hash_hex_check",
      sql`${table.codeHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_oidc_codes_expiry_check",
      sql`${table.issuedAt} < ${table.expiresAt} AND ${table.expiresAt} <= ${table.issuedAt} + interval '5 minutes'`,
    ),
    check(
      "company_oidc_codes_terminal_state_check",
      sql`NOT (${table.consumedAt} IS NOT NULL AND ${table.revokedAt} IS NOT NULL)`,
    ),
    check(
      "company_oidc_codes_consumed_time_check",
      sql`${table.consumedAt} IS NULL OR (${table.consumedAt} >= ${table.issuedAt} AND ${table.consumedAt} < ${table.expiresAt})`,
    ),
    check(
      "company_oidc_codes_pkce_challenge_format_check",
      sql`${table.codeChallenge} ~ '^[A-Za-z0-9_-]{43}$'`,
    ),
    check(
      "company_oidc_codes_nonce_length_check",
      sql`char_length(${table.nonce}) between 1 and 255`,
    ),
    index("company_oidc_codes_client_expiry_idx").on(
      table.oidcClientId,
      table.expiresAt,
    ),
    index("company_oidc_codes_session_idx").on(table.ssoSessionId),
  ],
);

/** Append-only security events whose metadata is restricted to reviewed keys. */
export const companyIdentityAuditEvents = pgTable(
  "company_identity_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    correlationId: uuid("correlation_id").notNull(),
    actorType: companyAuditActorTypeEnum("actor_type").notNull(),
    actorAccountId: uuid("actor_account_id"),
    actorServiceKey: varchar("actor_service_key", { length: 128 }),
    organizationId: uuid("organization_id"),
    applicationId: uuid("application_id"),
    targetAccountId: uuid("target_account_id"),
    operation: varchar("operation", { length: 128 }).notNull(),
    outcome: companyAuditOutcomeEnum("outcome").notNull(),
    reasonCode: varchar("reason_code", { length: 128 }),
    ipHash: char("ip_hash", { length: 64 }),
    userAgentFamily: varchar("user_agent_family", { length: 128 }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "company_identity_audit_events_actor_account_fk",
      columns: [table.actorAccountId],
      foreignColumns: [companyAccounts.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_identity_audit_events_organization_fk",
      columns: [table.organizationId],
      foreignColumns: [companyOrganizations.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_identity_audit_events_application_fk",
      columns: [table.applicationId],
      foreignColumns: [companyApplications.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_identity_audit_events_target_account_fk",
      columns: [table.targetAccountId],
      foreignColumns: [companyAccounts.id],
    }).onDelete("restrict"),
    check(
      "company_identity_audit_events_actor_check",
      sql`(${table.actorType} = 'ACCOUNT' AND ${table.actorAccountId} IS NOT NULL AND ${table.actorServiceKey} IS NULL) OR (${table.actorType} = 'SERVICE' AND ${table.actorAccountId} IS NULL AND ${table.actorServiceKey} IS NOT NULL) OR (${table.actorType} = 'SYSTEM' AND ${table.actorAccountId} IS NULL AND ${table.actorServiceKey} IS NULL)`,
    ),
    check(
      "company_identity_audit_events_actor_service_key_length_check",
      sql`${table.actorServiceKey} IS NULL OR char_length(${table.actorServiceKey}) between 1 and 128`,
    ),
    check(
      "company_identity_audit_events_ip_hash_hex_check",
      sql`${table.ipHash} IS NULL OR ${table.ipHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_identity_audit_events_metadata_allowed_keys_check",
      sql`jsonb_typeof(${table.metadata}) = 'object' AND (${table.metadata} - ARRAY['source', 'previousStatus', 'newStatus', 'roleKey', 'clientId', 'credentialAlgorithm', 'sessionCount', 'normalizationVersion', 'migrationRunId', 'sourcePrincipalId', 'sourceFingerprint', 'idempotencyReplay', 'expiresAt', 'reasonCategory']::text[]) = '{}'::jsonb`,
    ),
    check(
      "company_identity_audit_events_operation_length_check",
      sql`char_length(${table.operation}) between 1 and 128`,
    ),
    check(
      "company_identity_audit_events_reason_code_length_check",
      sql`${table.reasonCode} IS NULL OR char_length(${table.reasonCode}) between 1 and 128`,
    ),
    check(
      "company_identity_audit_events_user_agent_family_length_check",
      sql`${table.userAgentFamily} IS NULL OR char_length(${table.userAgentFamily}) between 1 and 128`,
    ),
    index("company_identity_audit_events_occurred_at_idx").on(table.occurredAt),
    index("company_identity_audit_events_actor_occurred_idx").on(
      table.actorAccountId,
      table.occurredAt,
    ),
    index("company_identity_audit_events_operation_occurred_idx").on(
      table.operation,
      table.occurredAt,
    ),
    index("company_identity_audit_events_target_occurred_idx").on(
      table.targetAccountId,
      table.occurredAt,
    ),
    index("company_identity_audit_events_correlation_idx").on(
      table.correlationId,
    ),
  ],
);

/** Immutable non-enumerating login telemetry with keyed identifier hashes. */
export const companyLoginAttempts = pgTable(
  "company_login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    correlationId: uuid("correlation_id").notNull(),
    normalizedUsernameHash: char("normalized_username_hash", {
      length: 64,
    }).notNull(),
    ipHash: char("ip_hash", { length: 64 }).notNull(),
    oidcClientId: uuid("oidc_client_id"),
    outcome: companyLoginOutcomeEnum("outcome").notNull(),
    accountId: uuid("account_id"),
    latencyMs: integer("latency_ms").notNull(),
  },
  (table) => [
    foreignKey({
      name: "company_login_attempts_oidc_client_fk",
      columns: [table.oidcClientId],
      foreignColumns: [companyOidcClients.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "company_login_attempts_account_fk",
      columns: [table.accountId],
      foreignColumns: [companyAccounts.id],
    }).onDelete("restrict"),
    check(
      "company_login_attempts_username_hash_hex_check",
      sql`${table.normalizedUsernameHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_login_attempts_ip_hash_hex_check",
      sql`${table.ipHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check("company_login_attempts_latency_check", sql`${table.latencyMs} >= 0`),
    index("company_login_attempts_occurred_at_idx").on(table.occurredAt),
    index("company_login_attempts_username_occurred_idx").on(
      table.normalizedUsernameHash,
      table.occurredAt,
    ),
    index("company_login_attempts_ip_occurred_idx").on(
      table.ipHash,
      table.occurredAt,
    ),
    index("company_login_attempts_outcome_occurred_idx").on(
      table.outcome,
      table.occurredAt,
    ),
  ],
);

/** Independent username and IP login-throttling state. */
export const companyLoginRateLimitBuckets = pgTable(
  "company_login_rate_limit_buckets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: companyRateLimitKindEnum("kind").notNull(),
    identifierHash: char("identifier_hash", { length: 64 }).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    challengeRequiredAt: timestamp("challenge_required_at", {
      withTimezone: true,
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("company_rate_limit_buckets_kind_identifier_unique").on(
      table.kind,
      table.identifierHash,
    ),
    check(
      "company_rate_limit_buckets_identifier_hash_hex_check",
      sql`${table.identifierHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_rate_limit_buckets_failed_count_check",
      sql`${table.failedCount} >= 0`,
    ),
    check(
      "company_rate_limit_buckets_last_attempt_check",
      sql`${table.lastAttemptAt} >= ${table.windowStartedAt}`,
    ),
    check(
      "company_rate_limit_buckets_blocked_until_check",
      sql`${table.blockedUntil} IS NULL OR ${table.blockedUntil} > ${table.windowStartedAt}`,
    ),
    check(
      "company_rate_limit_buckets_challenge_required_at_check",
      sql`${table.challengeRequiredAt} IS NULL OR ${table.challengeRequiredAt} >= ${table.windowStartedAt}`,
    ),
  ],
);

/** Durable lease and replay records for idempotent identity operations. */
export const companyIdentityIdempotencyRecords = pgTable(
  "company_identity_idempotency_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operation: varchar("operation", { length: 128 }).notNull(),
    scopeKey: varchar("scope_key", { length: 200 }).notNull(),
    idempotencyKeyHash: char("idempotency_key_hash", { length: 64 }).notNull(),
    requestHash: char("request_hash", { length: 64 }).notNull(),
    state: companyIdempotencyStateEnum("state")
      .default("IN_PROGRESS")
      .notNull(),
    ownerTokenHash: char("owner_token_hash", { length: 64 }),
    safeResult: jsonb("safe_result").$type<Record<string, unknown>>(),
    safeErrorCode: varchar("safe_error_code", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("company_identity_idempotency_operation_scope_key_unique").on(
      table.operation,
      table.scopeKey,
      table.idempotencyKeyHash,
    ),
    check(
      "company_identity_idempotency_key_hash_hex_check",
      sql`${table.idempotencyKeyHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_identity_idempotency_request_hash_hex_check",
      sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_identity_idempotency_owner_hash_hex_check",
      sql`${table.ownerTokenHash} IS NULL OR ${table.ownerTokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "company_identity_idempotency_operation_length_check",
      sql`char_length(${table.operation}) between 1 and 128`,
    ),
    check(
      "company_identity_idempotency_scope_key_length_check",
      sql`char_length(${table.scopeKey}) between 1 and 200`,
    ),
    check(
      "company_identity_idempotency_scope_key_format_check",
      sql`${table.scopeKey} ~ '^(global|organization:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|account:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$'`,
    ),
    check(
      "company_identity_idempotency_safe_error_code_length_check",
      sql`${table.safeErrorCode} IS NULL OR char_length(${table.safeErrorCode}) between 1 and 128`,
    ),
    check(
      "company_identity_idempotency_completed_time_check",
      sql`${table.completedAt} IS NULL OR ${table.completedAt} >= ${table.createdAt}`,
    ),
    check(
      "company_identity_idempotency_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "company_identity_idempotency_state_check",
      sql`(${table.state} = 'IN_PROGRESS' AND ${table.ownerTokenHash} IS NOT NULL AND ${table.leaseExpiresAt} IS NOT NULL AND ${table.completedAt} IS NULL AND ${table.safeResult} IS NULL AND ${table.safeErrorCode} IS NULL) OR (${table.state} = 'SUCCEEDED' AND ${table.ownerTokenHash} IS NULL AND ${table.leaseExpiresAt} IS NULL AND ${table.completedAt} IS NOT NULL AND ${table.safeResult} IS NOT NULL AND ${table.safeErrorCode} IS NULL) OR (${table.state} = 'FAILED' AND ${table.ownerTokenHash} IS NULL AND ${table.leaseExpiresAt} IS NULL AND ${table.completedAt} IS NOT NULL AND ${table.safeResult} IS NULL AND ${table.safeErrorCode} IS NOT NULL)`,
    ),
    index("company_identity_idempotency_expires_idx").on(table.expiresAt),
  ],
);

/** Drizzle relationship graph rooted at company employee accounts. */
export const companyAccountsRelations = relations(
  companyAccounts,
  ({ one, many }) => ({
    passwordCredential: one(companyPasswordCredentials),
    memberships: many(companyOrganizationMemberships),
    assignedCompanyRoles: many(companyRoleAssignments),
    assignedApplicationRoles: many(companyApplicationRoleAssignments),
    auditEventsAsActor: many(companyIdentityAuditEvents, {
      relationName: "company_audit_actor_account",
    }),
    auditEventsAsTarget: many(companyIdentityAuditEvents, {
      relationName: "company_audit_target_account",
    }),
    loginAttempts: many(companyLoginAttempts),
  }),
);

/** Drizzle relationship from a password credential to its employee account. */
export const companyPasswordCredentialsRelations = relations(
  companyPasswordCredentials,
  ({ one }) => ({
    account: one(companyAccounts, {
      fields: [companyPasswordCredentials.accountId],
      references: [companyAccounts.id],
    }),
  }),
);

/** Drizzle relationship graph rooted at the internal company organization. */
export const companyOrganizationsRelations = relations(
  companyOrganizations,
  ({ many }) => ({
    memberships: many(companyOrganizationMemberships),
    auditEvents: many(companyIdentityAuditEvents),
  }),
);

/** Drizzle relationship graph for organization memberships. */
export const companyOrganizationMembershipsRelations = relations(
  companyOrganizationMemberships,
  ({ one, many }) => ({
    organization: one(companyOrganizations, {
      fields: [companyOrganizationMemberships.organizationId],
      references: [companyOrganizations.id],
    }),
    account: one(companyAccounts, {
      fields: [companyOrganizationMemberships.accountId],
      references: [companyAccounts.id],
    }),
    companyRoleAssignments: many(companyRoleAssignments),
    applicationRoleAssignments: many(companyApplicationRoleAssignments),
    ssoSessions: many(companySsoSessions),
  }),
);

/** Drizzle relationships for additive company-level role grants. */
export const companyRoleAssignmentsRelations = relations(
  companyRoleAssignments,
  ({ one }) => ({
    membership: one(companyOrganizationMemberships, {
      fields: [
        companyRoleAssignments.organizationId,
        companyRoleAssignments.membershipId,
      ],
      references: [
        companyOrganizationMemberships.organizationId,
        companyOrganizationMemberships.id,
      ],
    }),
    assignedByAccount: one(companyAccounts, {
      fields: [companyRoleAssignments.assignedByAccountId],
      references: [companyAccounts.id],
    }),
  }),
);

/** Drizzle relationship graph rooted at registered company applications. */
export const companyApplicationsRelations = relations(
  companyApplications,
  ({ many }) => ({
    roleDefinitions: many(companyApplicationRoleDefinitions),
    sessions: many(companyApplicationSessions),
    oidcClients: many(companyOidcClients),
    auditEvents: many(companyIdentityAuditEvents),
  }),
);

/** Drizzle relationships for application-local role definitions. */
export const companyApplicationRoleDefinitionsRelations = relations(
  companyApplicationRoleDefinitions,
  ({ one, many }) => ({
    application: one(companyApplications, {
      fields: [companyApplicationRoleDefinitions.applicationId],
      references: [companyApplications.id],
    }),
    assignments: many(companyApplicationRoleAssignments),
  }),
);

/** Drizzle relationships for membership-anchored application role grants. */
export const companyApplicationRoleAssignmentsRelations = relations(
  companyApplicationRoleAssignments,
  ({ one }) => ({
    membership: one(companyOrganizationMemberships, {
      fields: [
        companyApplicationRoleAssignments.organizationId,
        companyApplicationRoleAssignments.membershipId,
      ],
      references: [
        companyOrganizationMemberships.organizationId,
        companyOrganizationMemberships.id,
      ],
    }),
    roleDefinition: one(companyApplicationRoleDefinitions, {
      fields: [
        companyApplicationRoleAssignments.applicationId,
        companyApplicationRoleAssignments.roleKey,
      ],
      references: [
        companyApplicationRoleDefinitions.applicationId,
        companyApplicationRoleDefinitions.roleKey,
      ],
    }),
    assignedByAccount: one(companyAccounts, {
      fields: [companyApplicationRoleAssignments.assignedByAccountId],
      references: [companyAccounts.id],
    }),
  }),
);

/** Drizzle relationship graph for Accounts SSO sessions. */
export const companySsoSessionsRelations = relations(
  companySsoSessions,
  ({ one, many }) => ({
    membership: one(companyOrganizationMemberships, {
      fields: [
        companySsoSessions.organizationId,
        companySsoSessions.membershipId,
      ],
      references: [
        companyOrganizationMemberships.organizationId,
        companyOrganizationMemberships.id,
      ],
    }),
    applicationSessions: many(companyApplicationSessions),
    authorizationCodes: many(companyOidcAuthorizationCodes),
  }),
);

/** Drizzle relationships for application-local sessions. */
export const companyApplicationSessionsRelations = relations(
  companyApplicationSessions,
  ({ one }) => ({
    ssoSession: one(companySsoSessions, {
      fields: [
        companyApplicationSessions.ssoSessionId,
        companyApplicationSessions.organizationId,
        companyApplicationSessions.membershipId,
      ],
      references: [
        companySsoSessions.id,
        companySsoSessions.organizationId,
        companySsoSessions.membershipId,
      ],
    }),
    application: one(companyApplications, {
      fields: [companyApplicationSessions.applicationId],
      references: [companyApplications.id],
    }),
  }),
);

/** Drizzle relationship graph for OIDC clients. */
export const companyOidcClientsRelations = relations(
  companyOidcClients,
  ({ one, many }) => ({
    application: one(companyApplications, {
      fields: [companyOidcClients.applicationId],
      references: [companyApplications.id],
    }),
    redirectUris: many(companyOidcRedirectUris),
    authorizationCodes: many(companyOidcAuthorizationCodes),
    loginAttempts: many(companyLoginAttempts),
  }),
);

/** Drizzle relationships for exact OIDC redirect URI registrations. */
export const companyOidcRedirectUrisRelations = relations(
  companyOidcRedirectUris,
  ({ one, many }) => ({
    client: one(companyOidcClients, {
      fields: [companyOidcRedirectUris.oidcClientId],
      references: [companyOidcClients.id],
    }),
    authorizationCodes: many(companyOidcAuthorizationCodes),
  }),
);

/** Drizzle relationships for one-time OIDC authorization codes. */
export const companyOidcAuthorizationCodesRelations = relations(
  companyOidcAuthorizationCodes,
  ({ one }) => ({
    client: one(companyOidcClients, {
      fields: [companyOidcAuthorizationCodes.oidcClientId],
      references: [companyOidcClients.id],
    }),
    redirectUri: one(companyOidcRedirectUris, {
      fields: [
        companyOidcAuthorizationCodes.redirectUriId,
        companyOidcAuthorizationCodes.oidcClientId,
      ],
      references: [
        companyOidcRedirectUris.id,
        companyOidcRedirectUris.oidcClientId,
      ],
    }),
    ssoSession: one(companySsoSessions, {
      fields: [companyOidcAuthorizationCodes.ssoSessionId],
      references: [companySsoSessions.id],
    }),
  }),
);

/** Drizzle relationships for immutable company identity audit events. */
export const companyIdentityAuditEventsRelations = relations(
  companyIdentityAuditEvents,
  ({ one }) => ({
    actorAccount: one(companyAccounts, {
      fields: [companyIdentityAuditEvents.actorAccountId],
      references: [companyAccounts.id],
      relationName: "company_audit_actor_account",
    }),
    organization: one(companyOrganizations, {
      fields: [companyIdentityAuditEvents.organizationId],
      references: [companyOrganizations.id],
    }),
    application: one(companyApplications, {
      fields: [companyIdentityAuditEvents.applicationId],
      references: [companyApplications.id],
    }),
    targetAccount: one(companyAccounts, {
      fields: [companyIdentityAuditEvents.targetAccountId],
      references: [companyAccounts.id],
      relationName: "company_audit_target_account",
    }),
  }),
);

/** Drizzle relationships for non-enumerating login-attempt evidence. */
export const companyLoginAttemptsRelations = relations(
  companyLoginAttempts,
  ({ one }) => ({
    oidcClient: one(companyOidcClients, {
      fields: [companyLoginAttempts.oidcClientId],
      references: [companyOidcClients.id],
    }),
    account: one(companyAccounts, {
      fields: [companyLoginAttempts.accountId],
      references: [companyAccounts.id],
    }),
  }),
);

/** Empty relation graph for standalone login rate-limit buckets. */
export const companyLoginRateLimitBucketsRelations = relations(
  companyLoginRateLimitBuckets,
  () => ({}),
);

/** Empty relation graph for standalone identity idempotency records. */
export const companyIdentityIdempotencyRecordsRelations = relations(
  companyIdentityIdempotencyRecords,
  () => ({}),
);
