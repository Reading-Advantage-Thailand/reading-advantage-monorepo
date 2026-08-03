import { z } from "zod";

const clientSchema = <TApplication extends string, TClient extends string, TRedirect extends string>(
  applicationKey: TApplication,
  clientId: TClient,
  redirectUri: TRedirect,
) => z.strictObject({
  applicationKey: z.literal(applicationKey),
  clientId: z.literal(clientId),
  clientSecret: z.string().min(32),
  redirectUri: z.literal(redirectUri),
});

/** Strict production owner and exact client-registration bootstrap contract. */
export const productionBootstrapSchema = z.strictObject({
  directDatabaseUrl: z.string().url(),
  ownerUsername: z.string().min(1).max(64),
  ownerDisplayName: z.string().trim().min(1).max(200),
  ownerPassword: z.string().min(12),
  clients: z.tuple([
    clientSchema("marketing", "marketing-web", "https://marketing.reading-advantage.com/api/auth/callback"),
    clientSchema("sales", "sales-web", "https://sales.reading-advantage.com/api/auth/callback"),
    clientSchema("codecamp", "codecamp-web", "https://codecamp.reading-advantage.com/api/auth/callback"),
    clientSchema("workbooks", "workbooks-web", "https://workbooks.reading-advantage.com/api/auth/callback"),
  ]),
});

/** Validated production bootstrap input. */
export type ProductionBootstrapInput = z.infer<typeof productionBootstrapSchema>;

/**
 * Parses the secret-bearing process environment without logging values.
 * @param environment Explicit process environment mapping.
 * @returns Strict owner and client registration input.
 */
export function createProductionBootstrapInput(
  environment: Readonly<Record<string, string | undefined>>,
): ProductionBootstrapInput {
  const parsed = productionBootstrapSchema.safeParse({
    directDatabaseUrl: environment.COMPANY_AUTH_DIRECT_DATABASE_URL,
    ownerUsername: environment.COMPANY_AUTH_BOOTSTRAP_OWNER_USERNAME,
    ownerDisplayName: environment.COMPANY_AUTH_BOOTSTRAP_OWNER_DISPLAY_NAME,
    ownerPassword: environment.COMPANY_AUTH_BOOTSTRAP_OWNER_PASSWORD,
    clients: [
      {
        applicationKey: "marketing",
        clientId: "marketing-web",
        clientSecret: environment.MARKETING_COMPANY_AUTH_OIDC_CLIENT_SECRET,
        redirectUri: "https://marketing.reading-advantage.com/api/auth/callback",
      },
      {
        applicationKey: "sales",
        clientId: "sales-web",
        clientSecret: environment.SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET,
        redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
      },
      {
        applicationKey: "codecamp",
        clientId: "codecamp-web",
        clientSecret: environment.CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET,
        redirectUri: "https://codecamp.reading-advantage.com/api/auth/callback",
      },
      {
        applicationKey: "workbooks",
        clientId: "workbooks-web",
        clientSecret: environment.WORKBOOKS_COMPANY_AUTH_OIDC_CLIENT_SECRET,
        redirectUri: "https://workbooks.reading-advantage.com/api/auth/callback",
      },
    ],
  });
  if (!parsed.success) {
    throw new Error(`Invalid Accounts bootstrap environment: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }
  return parsed.data;
}
