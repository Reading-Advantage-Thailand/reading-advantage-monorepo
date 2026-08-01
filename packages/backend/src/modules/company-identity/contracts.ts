import { z } from "zod";

/** Supported company-wide identity roles. */
export const companyRoleSchema = z.enum(["EMPLOYEE", "COMPANY_ADMIN"]);

/** Supported lifecycle values for an employee identity. */
export const employeeStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

/** Application-scoped role key grammar. */
export const appRoleKeySchema = z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/);

/** Stable application key grammar. */
export const applicationKeySchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/);

/** Public employee projection returned by identity capabilities. */
export const employeeSchema = z.strictObject({
  id: z.string().uuid(),
  username: z.string().min(1).max(64),
  displayName: z.string().min(1).max(200),
  status: employeeStatusSchema,
  companyRoles: z.array(companyRoleSchema),
  appRoles: z.record(applicationKeySchema, z.array(appRoleKeySchema)),
  createdAt: z.string().datetime({ offset: true }),
});

/** Public employee projection. */
export type Employee = z.infer<typeof employeeSchema>;

/** Input used to authenticate a first-party company employee. */
export const authenticateEmployeeInputSchema = z.strictObject({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(1024),
  clientId: z.string().min(1).max(128),
  ipAddress: z.string().min(1).max(200),
  userAgent: z.string().min(1).max(512),
});

/** Result of a successful Accounts sign-in. */
export const authenticateEmployeeOutputSchema = z.strictObject({
  sessionToken: z.string().min(32),
  expiresAt: z.string().datetime({ offset: true }),
  employee: employeeSchema,
});

/** Exact OpenID Connect authorization request accepted by Accounts. */
export const oidcAuthorizationInputSchema = z.strictObject({
  clientId: z.string().min(1).max(128),
  redirectUri: z.string().url().max(2048),
  responseType: z.literal("code"),
  scope: z.string().refine((value) => value.split(/\s+/).includes("openid")),
  state: z.string().min(16).max(512),
  nonce: z.string().min(16).max(255),
  codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  codeChallengeMethod: z.literal("S256"),
  ssoSessionToken: z.string().min(32),
});

/** Successful OpenID Connect authorization result. */
export const oidcAuthorizationOutputSchema = z.strictObject({
  code: z.string().min(32),
  redirectUri: z.string().url(),
  state: z.string(),
  expiresAt: z.string().datetime({ offset: true }),
});

/** OpenID Connect authorization-code exchange input. */
export const oidcTokenInputSchema = z.strictObject({
  grantType: z.literal("authorization_code"),
  code: z.string().min(32),
  clientId: z.string().min(1).max(128),
  clientSecret: z.string().min(32).max(1024).optional(),
  redirectUri: z.string().url().max(2048),
  codeVerifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
});

/** Audience-specific identity claims signed into an ID token. */
export const companyIdentityClaimsSchema = z.strictObject({
  iss: z.string().url(),
  sub: z.string().uuid(),
  username: z.string().min(1).max(64),
  displayName: z.string().min(1).max(200),
  aud: z.string().min(1),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  nonce: z.string().min(1),
  sid: z.string().uuid(),
  organizationId: z.string().uuid(),
  organizationKey: applicationKeySchema,
  status: z.literal("ACTIVE"),
  roles: z.array(appRoleKeySchema),
  authVersion: z.number().int().positive(),
});

/** Audience-specific identity claims. */
export type CompanyIdentityClaims = z.infer<
  typeof companyIdentityClaimsSchema
>;

/** Token response returned by the Accounts token endpoint. */
export const oidcTokenOutputSchema = z.strictObject({
  accessToken: z.string().min(32),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().int().positive(),
  idToken: z.string().min(32),
});

/** Exact opaque application or SSO session-token grammar issued by Accounts. */
export const sessionTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/** Strict bearer authorization contract accepted by the OIDC local-logout endpoint. */
export const oidcLogoutInputSchema = z.strictObject({
  authorization: z.string().regex(/^Bearer [A-Za-z0-9_-]{43}$/),
}).transform(({ authorization }) => ({
  accessToken: sessionTokenSchema.parse(authorization.slice(7)),
}));

/** Authenticated confidential-client request for token introspection. */
export const introspectionInputSchema = z.strictObject({
  accessToken: z.string().min(32),
  clientId: z.string().min(1).max(128),
  clientSecret: z.string().min(32).max(1024),
});

/** Active application-session projection returned by introspection. */
export const introspectionOutputSchema = z.strictObject({
  active: z.boolean(),
  identity: companyIdentityClaimsSchema.omit({
    iss: true,
    exp: true,
    iat: true,
    nonce: true,
  }).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

/** Company-administrator input for creating one employee. */
export const createEmployeeInputSchema = z.strictObject({
  actorAccountId: z.string().uuid(),
  username: z.string().min(1).max(64),
  displayName: z.string().trim().min(1).max(200),
  initialPassword: z.string().min(12).max(1024),
  companyRoles: z.array(companyRoleSchema).min(1),
  appRoles: z.record(applicationKeySchema, z.array(appRoleKeySchema)),
  idempotencyKey: z.string().min(16).max(200),
});

/** Company-administrator input for employee status changes. */
export const setEmployeeStatusInputSchema = z.strictObject({
  actorAccountId: z.string().uuid(),
  targetAccountId: z.string().uuid(),
  status: employeeStatusSchema,
  idempotencyKey: z.string().min(16).max(200),
});

/** Company-administrator input for replacing one application's roles. */
export const setApplicationRolesInputSchema = z.strictObject({
  actorAccountId: z.string().uuid(),
  targetAccountId: z.string().uuid(),
  applicationKey: applicationKeySchema,
  roleKeys: z.array(appRoleKeySchema),
  idempotencyKey: z.string().min(16).max(200),
});

/** Company-administrator input for replacing additive company roles. */
export const setCompanyRolesInputSchema = z.strictObject({
  actorAccountId: z.string().uuid(),
  targetAccountId: z.string().uuid(),
  roleKeys: z.array(companyRoleSchema).min(1),
  idempotencyKey: z.string().min(16).max(200),
});

/** Company-administrator input for resetting an employee credential. */
export const resetCredentialInputSchema = z.strictObject({
  actorAccountId: z.string().uuid(),
  targetAccountId: z.string().uuid(),
  newPassword: z.string().min(12).max(1024),
  idempotencyKey: z.string().min(16).max(200),
});

/** Company-administrator input for revoking every employee session. */
export const revokeEmployeeSessionsInputSchema = z.strictObject({
  actorAccountId: z.string().uuid(),
  targetAccountId: z.string().uuid(),
  idempotencyKey: z.string().min(16).max(200),
});

/** Success result shared by management commands. */
export const managementResultSchema = z.strictObject({
  employee: employeeSchema,
  sessionsRevoked: z.number().int().nonnegative(),
});
