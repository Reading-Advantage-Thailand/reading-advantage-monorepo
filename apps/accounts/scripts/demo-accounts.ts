import { randomBytes } from "node:crypto";

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
  void randomBytes;
  throw new Error("not implemented");
}

/**
 * Upserts one demo identity keyed on username.
 * @param environment Process environment containing the gitignored demo names.
 * @returns Nothing after the identity and its role assignment settle.
 * @throws When NODE_ENV is production or an identity is missing.
 */
export async function upsertDemoIdentity(
  environment: Readonly<Record<string, string | undefined>>,
): Promise<void> {
  void environment;
  throw new Error("not implemented");
}

/**
 * Disables one demo identity without touching any other row.
 * @param username Username of the identity to disable.
 * @returns Nothing after the intended row changes.
 * @throws When NODE_ENV is production or the username is unknown.
 */
export async function disableDemoIdentity(username: string): Promise<void> {
  void username;
  throw new Error("not implemented");
}

/**
 * Replaces one demo identity password and extends its role expiry.
 * @param username Username of the identity to rotate.
 * @returns Nothing after the password and expiry change.
 * @throws When NODE_ENV is production or the username is unknown.
 */
export async function rotateDemoIdentity(username: string): Promise<void> {
  void username;
  throw new Error("not implemented");
}
