import { z } from "zod";

/** One first-party application that Accounts issues employee roles for. */
export interface CataloguedApplication {
  /** URL-safe application key stored in employee role records. */
  readonly key: string;
  /** Human-readable application name shown in the console. */
  readonly label: string;
  /** Application host linked from the console. */
  readonly href: string;
  /** Role vocabulary the server allows the console to grant. */
  readonly roles: readonly string[];
}

const hostSchema = z.string().trim().url();

/**
 * Resolves one application host from the environment.
 * @param envValue Configured host value, or undefined when unset.
 * @param productionHost Production host used when no value is configured.
 * @returns The configured host, or the production default.
 * @throws When a configured value is not a URL.
 */
function configuredHost(envValue: string | undefined, productionHost: string): string {
  if (envValue === undefined || envValue.trim() === "") return productionHost;
  return hostSchema.parse(envValue);
}

/**
 * Serves the application catalogue and role vocabulary to the console.
 * @returns The server-owned catalogue; the client bundle holds none of it.
 */
export function applicationCatalogue(): readonly CataloguedApplication[] {
  return [
    {
      key: "marketing",
      label: "Marketing",
      href: configuredHost(
        process.env.ACCOUNTS_MARKETING_URL,
        "https://marketing.reading-advantage.com",
      ),
      roles: ["MEMBER", "ADMIN"],
    },
    {
      key: "sales",
      label: "Sales Advantage",
      href: configuredHost(
        process.env.ACCOUNTS_SALES_URL,
        "https://sales.reading-advantage.com",
      ),
      roles: ["SALES_REP", "SALES_ADMIN"],
    },
    {
      key: "codecamp",
      label: "Codecamp",
      href: configuredHost(
        process.env.ACCOUNTS_CODECAMP_URL,
        "https://codecamp.reading-advantage.com",
      ),
      roles: ["STUDENT", "INTERN", "TEACHER", "ADMIN"],
    },
  ];
}
