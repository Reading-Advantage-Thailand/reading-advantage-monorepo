// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const salesRoot = resolve(repositoryRoot, "apps/sales-advantage");
const router = readFileSync(
  resolve(repositoryRoot, "packages/api/src/routers/sales.ts"),
  "utf8",
);
const mutations = readFileSync(
  resolve(repositoryRoot, "packages/domain/src/sales/mutations.ts"),
  "utf8",
);
const schema = readFileSync(
  resolve(repositoryRoot, "packages/domain/src/sales/schema.ts"),
  "utf8",
);
const permissions = readFileSync(
  resolve(repositoryRoot, "packages/domain/src/sales/permissions.ts"),
  "utf8",
);
const handoffPage = readFileSync(
  resolve(salesRoot, "app/[locale]/admin/create-rep/page.tsx"),
  "utf8",
);
const trpcRoute = readFileSync(
  resolve(salesRoot, "app/api/trpc/[trpc]/route.ts"),
  "utf8",
);
const accountsPage = readFileSync(
  resolve(repositoryRoot, "apps/accounts/app/page.tsx"),
  "utf8",
);
const accountsConsole = readFileSync(
  resolve(repositoryRoot, "apps/accounts/app/accounts-console.tsx"),
  "utf8",
);

describe("Sales employee onboarding boundary", () => {
  it("has no Sales tRPC or domain credential-creation operation", () => {
    expect(router).not.toContain("createRep");
    expect(mutations).not.toContain("createRepAccount");
    expect(mutations).not.toContain("createCredentialAccount");
    expect(schema).not.toContain("createRepInputSchema");
    expect(schema).not.toContain("createRepOutputSchema");
    expect(permissions).not.toContain("sales:admin:create-rep");
  });

  it("replaces the Sales password form with an exact Accounts handoff", () => {
    expect(handoffPage).toContain("https://accounts.reading-advantage.com");
    expect(handoffPage).toContain('searchParams.set("application", "sales")');
    expect(handoffPage).toContain('searchParams.set("role", "SALES_REP")');
    expect(handoffPage).not.toContain("useMutation");
    expect(handoffPage).not.toContain('type="password"');
    expect(handoffPage).not.toContain("initialPassword");
  });

  it("makes Accounts consume only the validated Sales provisioning preset", () => {
    expect(accountsPage).toContain('search.application === "sales"');
    expect(accountsPage).toContain('search.role === "SALES_REP"');
    expect(accountsConsole).toContain('appRoles: provisioning');
    expect(accountsConsole).toContain(
      '[provisioning.applicationKey]: [provisioning.roleKey]',
    );
  });

  it("does not pass raw bearer evidence into shared tRPC context", () => {
    expect(trpcRoute).toContain('mode: "verified-principal"');
    expect(trpcRoute).not.toContain('headers.get("authorization")');
    expect(trpcRoute).not.toContain("authorization,");
  });
});
