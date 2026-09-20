import { getIdentityComposition } from "@/lib/server/identity";
import { isSafeReturnTo } from "@/lib/server/safe-return-path";
import {
  companyIdentityRouteHandlers,
} from "@/lib/server/company-identity-route-bindings";
import {
  currentEmployee,
  identityAuthenticationEvidence,
} from "@/lib/server/http";
import {
  companyIdentityCapabilityIds,
  type Employee,
} from "@reading-advantage/backend";

import { AccountsConsole } from "./accounts-console";
import { SignInPanel } from "./sign-in-panel";

async function firstEmployeeList(): Promise<Employee[]> {
  const composition = await getIdentityComposition();
  return companyIdentityRouteHandlers.employeesList(async () =>
    composition.executor.execute<Employee[]>({
      capabilityId: companyIdentityCapabilityIds.listEmployees,
      input: {},
      evidence: await identityAuthenticationEvidence(),
    }),
  );
}

/** Renders sign-in or the role-aware employee identity control room. */
export default async function AccountsPage(props: {
  searchParams: Promise<{
    returnTo?: string;
    application?: string;
    role?: string;
  }>;
}) {
  const [employee, search] = await Promise.all([currentEmployee(), props.searchParams]);
  const initialEmployees = employee?.companyRoles.includes("COMPANY_ADMIN")
    ? await firstEmployeeList()
    : undefined;
  const candidateReturnTo = search.returnTo ?? "";
  const queryIndex = candidateReturnTo.indexOf("?");
  const returnTo = isSafeReturnTo(
    queryIndex === -1 ? candidateReturnTo : candidateReturnTo.slice(0, queryIndex),
    queryIndex === -1 ? "" : candidateReturnTo.slice(queryIndex),
  )
    ? candidateReturnTo
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
        <AccountsConsole
          employee={employee}
          initialEmployees={initialEmployees}
          provisioning={provisioning}
        />
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
