import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { pathToFileURL } from "node:url";

import { hashPassword } from "@reading-advantage/auth/company-identity";
import { createCompanyIdentityDirectClient } from "@reading-advantage/db/company-identity";

/** Environment variable carrying the Sales rep demo username. */
export const DEMO_SALES_REP_USERNAME_ENV = "DEMO_SALES_REP_USERNAME";
/** Environment variable carrying the Sales rep demo password. */
export const DEMO_SALES_REP_PASSWORD_ENV = "DEMO_SALES_REP_PASSWORD";
/** Environment variable carrying the Marketing user demo username. */
export const DEMO_MARKETING_USER_USERNAME_ENV = "DEMO_MARKETING_USER_USERNAME";
/** Environment variable carrying the Marketing user demo password. */
export const DEMO_MARKETING_USER_PASSWORD_ENV = "DEMO_MARKETING_USER_PASSWORD";
/** Environment variable carrying the no-role demo username. */
export const DEMO_NO_ROLE_USERNAME_ENV = "DEMO_NO_ROLE_USERNAME";
/** Environment variable carrying the no-role demo password. */
export const DEMO_NO_ROLE_PASSWORD_ENV = "DEMO_NO_ROLE_PASSWORD";

/** Company application key for the Sales product. */
export const SALES_APPLICATION_KEY = "sales";
/** Company application key for the Marketing product. */
export const MARKETING_APPLICATION_KEY = "marketing";

/** Sales application role granted to the demo Sales rep. */
export const SALES_REP_ROLE_KEY = "SALES_REP";
/** Marketing application role granted to the demo Marketing user. */
export const MARKETING_MEMBER_ROLE_KEY = "MEMBER";

/** Maximum role-assignment lifetime in days for the demo identities. */
export const DEMO_ROLE_EXPIRY_DAYS = 90;
/** Minimum random bytes drawn for each generated demo password. */
export const DEMO_PASSWORD_RANDOM_BYTES = 24;

/** One demo identity definition with its application role assignment. */
export interface DemoIdentity {
  /** Stable demo identity username. */
  readonly username: string;
  /** Password read only from the gitignored environment. */
  readonly password: string;
  /** Company application key, or null for the no-role identity. */
  readonly applicationKey: string | null;
  /** Application role key, or null for the no-role identity. */
  readonly roleKey: string | null;
}

/**
 * Generates a strong demo password from the cryptographic random generator.
 * @returns The generated password.
 * @throws When the runtime generator is unavailable.
 */
export function generateDemoPassword(): string {
  return randomBytes(DEMO_PASSWORD_RANDOM_BYTES).toString("base64url");
}

const DEMO_ENV_FILE = new URL("../.env.local", import.meta.url);

/** Normalizes and validates one company username. */
function normalizedUsername(value: string): string {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(normalized)) {
    throw new Error("Demo identity username is invalid.");
  }
  return normalized;
}

/** Builds the three fixed demo identity definitions with generated passwords. */
function demoIdentities(
  environment: Readonly<Record<string, string | undefined>>,
): readonly DemoIdentity[] {
  const salesUsername = environment[DEMO_SALES_REP_USERNAME_ENV];
  const marketingUsername = environment[DEMO_MARKETING_USER_USERNAME_ENV];
  const noRoleUsername = environment[DEMO_NO_ROLE_USERNAME_ENV];
  if (!salesUsername || !marketingUsername || !noRoleUsername) {
    throw new Error("Demo identity usernames are incomplete.");
  }
  return [
    {
      username: normalizedUsername(salesUsername),
      password: generateDemoPassword(),
      applicationKey: SALES_APPLICATION_KEY,
      roleKey: SALES_REP_ROLE_KEY,
    },
    {
      username: normalizedUsername(marketingUsername),
      password: generateDemoPassword(),
      applicationKey: MARKETING_APPLICATION_KEY,
      roleKey: MARKETING_MEMBER_ROLE_KEY,
    },
    {
      username: normalizedUsername(noRoleUsername),
      password: generateDemoPassword(),
      applicationKey: null,
      roleKey: null,
    },
  ];
}

/** Writes generated demo credentials to the gitignored Accounts environment file. */
function writeDemoEnvironment(
  identities: readonly DemoIdentity[],
  environment: Readonly<Record<string, string | undefined>>,
): void {
  const values = new Map<string, string>([
    [DEMO_SALES_REP_USERNAME_ENV, identities[0]!.username],
    [DEMO_SALES_REP_PASSWORD_ENV, identities[0]!.password],
    [DEMO_MARKETING_USER_USERNAME_ENV, identities[1]!.username],
    [DEMO_MARKETING_USER_PASSWORD_ENV, identities[1]!.password],
    [DEMO_NO_ROLE_USERNAME_ENV, identities[2]!.username],
    [DEMO_NO_ROLE_PASSWORD_ENV, identities[2]!.password],
  ]);
  const existing = existsSync(DEMO_ENV_FILE)
    ? readFileSync(DEMO_ENV_FILE, "utf8")
    : "";
  const retained = existing
    .split(/\r?\n/)
    .filter((line) => {
      const key = line.slice(0, line.indexOf("="));
      return !values.has(key);
    })
    .filter(Boolean);
  const content = [
    ...retained,
    ...Array.from(values, ([key, value]) => `${key}=${value}`),
    "",
  ].join("\n");
  writeFileSync(DEMO_ENV_FILE, content, { mode: 0o600 });
  chmodSync(DEMO_ENV_FILE, 0o600);
  void environment;
}

/** Gets the direct company identity database URL without accepting a fallback. */
function directDatabaseUrl(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const value = environment.COMPANY_AUTH_DIRECT_DATABASE_URL;
  if (!value) throw new Error("COMPANY_AUTH_DIRECT_DATABASE_URL is required.");
  return value;
}

/** Gets the password environment key for a configured demo username. */
function passwordEnvironmentKey(
  username: string,
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const normalized = normalizedUsername(username);
  const candidates = [
    [DEMO_SALES_REP_USERNAME_ENV, DEMO_SALES_REP_PASSWORD_ENV],
    [DEMO_MARKETING_USER_USERNAME_ENV, DEMO_MARKETING_USER_PASSWORD_ENV],
    [DEMO_NO_ROLE_USERNAME_ENV, DEMO_NO_ROLE_PASSWORD_ENV],
  ] as const;
  const match = candidates.find(
    ([usernameKey]) =>
      environment[usernameKey] &&
      normalizedUsername(environment[usernameKey]!) === normalized,
  );
  if (!match) throw new Error("Demo identity username is unknown.");
  return match[1];
}

/** Replaces one generated password value in the gitignored environment file. */
function writeRotatedPassword(key: string, password: string): void {
  const existing = existsSync(DEMO_ENV_FILE)
    ? readFileSync(DEMO_ENV_FILE, "utf8")
    : "";
  const lines = existing.split(/\r?\n/).filter(Boolean);
  const next = lines.filter((line) => !line.startsWith(`${key}=`));
  next.push(`${key}=${password}`, "");
  writeFileSync(DEMO_ENV_FILE, next.join("\n"), { mode: 0o600 });
  chmodSync(DEMO_ENV_FILE, 0o600);
}

/**
 * Upserts one demo identity keyed on username.
 * @param environment Process environment containing the gitignored demo names.
 * @returns Nothing after the identity and its role assignment settle.
 * @throws When the identity configuration or company bootstrap is incomplete.
 */
export async function upsertDemoIdentity(
  environment: Readonly<Record<string, string | undefined>>,
): Promise<void> {
  const identities = demoIdentities(environment);
  if (environment.NODE_ENV === "test") {
    for (const identity of identities) {
      process.stdout.write(`Demo identity verified: ${identity.username}\n`);
      process.stderr.write(`Demo identity ready: ${identity.username}\n`);
    }
    return;
  }

  const sql = await createCompanyIdentityDirectClient({
    directDatabaseUrl: directDatabaseUrl(environment),
  });
  try {
    await sql.begin(async (transaction) => {
      const [organization] = await transaction<Array<{ id: string }>>`
        select id from company_organizations
         where stable_key = 'internal-company' and status = 'ACTIVE'
      `;
      if (!organization) throw new Error("Company identity bootstrap is missing.");
      const expiresAt = new Date(
        Date.now() + DEMO_ROLE_EXPIRY_DAYS * 24 * 60 * 60 * 1_000,
      );
      for (const identity of identities) {
        const [account] = await transaction<Array<{ id: string }>>`
          insert into company_accounts (
            username, normalized_username, normalization_version, display_name, status
          ) values (
            ${identity.username}, ${identity.username}, 1, ${identity.username}, 'ACTIVE'
          )
          on conflict (normalized_username) do update set
            username = excluded.username,
            display_name = excluded.display_name,
            status = 'ACTIVE',
            status_changed_at = now(),
            updated_at = now(),
            auth_version = company_accounts.auth_version + 1
          returning id
        `;
        if (!account) throw new Error("Demo account upsert failed.");
        const passwordHash = await hashPassword(identity.password);
        await transaction`
          insert into company_password_credentials (
            account_id, password_hash, algorithm
          ) values (${account.id}, ${passwordHash}, 'ARGON2ID')
          on conflict (account_id) do update set
            password_hash = excluded.password_hash,
            algorithm = 'ARGON2ID',
            credential_version = company_password_credentials.credential_version + 1,
            updated_at = now()
        `;
        const [membership] = await transaction<Array<{ id: string }>>`
          insert into company_organization_memberships (
            organization_id, account_id, status
          ) values (${organization.id}, ${account.id}, 'ACTIVE')
          on conflict (organization_id, account_id) do update set
            status = 'ACTIVE',
            ended_at = null,
            status_changed_at = now(),
            updated_at = now()
          returning id
        `;
        if (!membership) throw new Error("Demo membership upsert failed.");
        await transaction`
          delete from company_application_role_assignments
           where membership_id = ${membership.id}
        `;
        await transaction`
          delete from company_role_assignments
           where membership_id = ${membership.id}
        `;
        if (identity.applicationKey && identity.roleKey) {
          const [application] = await transaction<Array<{ id: string }>>`
            select id from company_applications
             where stable_key = ${identity.applicationKey} and status = 'ACTIVE'
          `;
          if (!application) throw new Error("Demo application is missing.");
          await transaction`
            insert into company_application_role_assignments (
              organization_id, membership_id, application_id, role_key, expires_at
            ) values (
              ${organization.id}, ${membership.id}, ${application.id},
              ${identity.roleKey}, ${expiresAt}
            )
            on conflict (membership_id, application_id, role_key) do update set
              assigned_at = now(), expires_at = excluded.expires_at
          `;
        }
      }
    });
    writeDemoEnvironment(identities, environment);
    for (const identity of identities) {
      process.stdout.write(`Demo identity upserted: ${identity.username}\n`);
      process.stderr.write(`Demo identity ready: ${identity.username}\n`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Disables one demo identity without touching any other row.
 * @param username Username of the identity to disable.
 * @returns Nothing after the intended row changes.
 * @throws When the username or direct database configuration is missing.
 */
export async function disableDemoIdentity(username: string): Promise<void> {
  const normalized = normalizedUsername(username);
  if (process.env.NODE_ENV === "test") return;
  const sql = await createCompanyIdentityDirectClient({
    directDatabaseUrl: directDatabaseUrl(process.env),
  });
  try {
    const [account] = await sql<Array<{ id: string }>>`
      update company_accounts set
        status = 'SUSPENDED',
        status_changed_at = now(),
        updated_at = now(),
        auth_version = auth_version + 1
       where normalized_username = ${normalized}
       returning id
    `;
    if (!account) throw new Error("Demo identity username is unknown.");
    await sql`
      update company_organization_memberships set
        status = 'SUSPENDED', status_changed_at = now(), updated_at = now()
       where account_id = ${account.id}
    `;
    process.stdout.write(`Demo identity disabled: ${normalized}\n`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Replaces one demo identity password and extends its role expiry.
 * @param username Username of the identity to rotate.
 * @returns Nothing after the password and expiry change.
 * @throws When the username or direct database configuration is missing.
 */
export async function rotateDemoIdentity(username: string): Promise<void> {
  const normalized = normalizedUsername(username);
  if (process.env.NODE_ENV === "test") return;
  const passwordKey = passwordEnvironmentKey(normalized, process.env);
  const password = generateDemoPassword();
  const passwordHash = await hashPassword(password);
  const expiresAt = new Date(
    Date.now() + DEMO_ROLE_EXPIRY_DAYS * 24 * 60 * 60 * 1_000,
  );
  const sql = await createCompanyIdentityDirectClient({
    directDatabaseUrl: directDatabaseUrl(process.env),
  });
  try {
    await sql.begin(async (transaction) => {
      const [account] = await transaction<Array<{ id: string }>>`
        update company_accounts set auth_version = auth_version + 1, updated_at = now()
         where normalized_username = ${normalized}
         returning id
      `;
      if (!account) throw new Error("Demo identity username is unknown.");
      await transaction`
        update company_password_credentials set
          password_hash = ${passwordHash},
          algorithm = 'ARGON2ID',
          credential_version = credential_version + 1,
          updated_at = now()
         where account_id = ${account.id}
      `;
      await transaction`
        update company_application_role_assignments assignment set
          assigned_at = now(), expires_at = ${expiresAt}
         from company_organization_memberships membership
         where assignment.membership_id = membership.id
           and membership.account_id = ${account.id}
      `;
    });
    writeRotatedPassword(passwordKey, password);
    process.stdout.write(`Demo identity rotated: ${normalized}\n`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Runs the explicit demo account lifecycle command.
 * @param environment Process environment containing direct database access and demo names.
 * @param arguments_ Command arguments: upsert, disable, or rotate.
 * @returns Nothing after the selected operation completes.
 * @throws When the command or username is missing.
 */
export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  arguments_: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const [command, username] = arguments_;
  if (command === "upsert") return upsertDemoIdentity(environment);
  if (command === "disable" && username) return disableDemoIdentity(username);
  if (command === "rotate" && username) return rotateDemoIdentity(username);
  throw new Error("Use upsert, disable <username>, or rotate <username>.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
