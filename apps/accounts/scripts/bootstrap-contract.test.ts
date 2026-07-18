import { describe, expect, it } from "vitest";

import { createProductionBootstrapInput } from "./bootstrap-contract";

const base = {
  COMPANY_AUTH_DIRECT_DATABASE_URL: "postgresql://migration:secret@db.example/company_identity",
  COMPANY_AUTH_BOOTSTRAP_OWNER_USERNAME: "owner",
  COMPANY_AUTH_BOOTSTRAP_OWNER_DISPLAY_NAME: "Company Owner",
  COMPANY_AUTH_BOOTSTRAP_OWNER_PASSWORD: "a-long-bootstrap-password",
  MARKETING_COMPANY_AUTH_OIDC_CLIENT_SECRET: "m".repeat(32),
  SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET: "s".repeat(32),
  CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET: "c".repeat(32),
};

describe("production bootstrap contract", () => {
  it("requires one exact confidential client for each application", () => {
    expect(createProductionBootstrapInput(base).clients).toHaveLength(3);
    expect(createProductionBootstrapInput(base).clients.map((client) => client.clientId))
      .toEqual(["marketing-web", "sales-web", "codecamp-web"]);
  });

  it("rejects non-HTTPS callbacks and never includes secret values in errors", () => {
    const secret = "private-value-that-must-not-leak";
    expect(() => createProductionBootstrapInput({
      ...base,
      COMPANY_AUTH_BOOTSTRAP_OWNER_PASSWORD: secret,
      SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET: secret.slice(0, 12),
    })).toThrow("Invalid Accounts bootstrap environment");
    try {
      createProductionBootstrapInput({ ...base, SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET: secret.slice(0, 12) });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
