import { currentEmployee } from "@/lib/server/http";

import { AccountsConsole } from "./accounts-console";
import { SignInPanel } from "./sign-in-panel";

/** Renders sign-in or the role-aware employee identity control room. */
export default async function AccountsPage(props: {
  searchParams: Promise<{
    returnTo?: string;
    application?: string;
    role?: string;
  }>;
}) {
  const [employee, search] = await Promise.all([currentEmployee(), props.searchParams]);
  const returnTo = search.returnTo?.startsWith("/") && !search.returnTo.startsWith("//")
    ? search.returnTo
    : "/";
  const provisioning =
    search.application === "sales" && search.role === "SALES_REP"
      ? { applicationKey: "sales" as const, roleKey: "SALES_REP" as const }
      : undefined;

  return (
    <main className="shell">
      <div className="grid-haze" aria-hidden="true" />
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="Reading Advantage Accounts home">
          <span className="wordmark-mark">RA</span>
          <span>Identity Office</span>
        </a>
        <span className="system-state"><i /> COMPANY DIRECTORY · LIVE</span>
      </header>
      {employee ? (
        <AccountsConsole employee={employee} provisioning={provisioning} />
      ) : (
        <SignInPanel returnTo={returnTo} />
      )}
      <footer className="footer-line">
        <span>One employee identity.</span>
        <span>Application access remains independently scoped.</span>
      </footer>
    </main>
  );
}
