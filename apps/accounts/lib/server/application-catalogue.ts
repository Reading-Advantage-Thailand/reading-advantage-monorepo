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

/**
 * Serves the application catalogue and role vocabulary to the console.
 * @returns The server-owned catalogue; the client bundle holds none of it.
 */
export function applicationCatalogue(): readonly CataloguedApplication[] {
  return [
    {
      key: "marketing",
      label: "Marketing",
      href: "https://marketing.reading-advantage.com",
      roles: ["MEMBER", "ADMIN"],
    },
    {
      key: "sales",
      label: "Sales Advantage",
      href: "https://sales.reading-advantage.com",
      roles: ["SALES_REP", "SALES_ADMIN"],
    },
    {
      key: "codecamp",
      label: "Codecamp",
      href: "https://codecamp.reading-advantage.com",
      roles: ["STUDENT", "INTERN", "TEACHER", "ADMIN"],
    },
  ];
}
