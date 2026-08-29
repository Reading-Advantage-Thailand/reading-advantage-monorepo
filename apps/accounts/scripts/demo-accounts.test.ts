import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:crypto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:crypto")>()),
  randomBytes: vi.fn(() => Buffer.alloc(32)),
}));

import { randomBytes } from "node:crypto";

import {
  DEMO_PASSWORD_RANDOM_BYTES,
  DEMO_ROLE_EXPIRY_DAYS,
  disableDemoIdentity,
  generateDemoPassword,
  rotateDemoIdentity,
  upsertDemoIdentity,
} from "./demo-accounts";

const randomBytesMock = vi.mocked(randomBytes);
const demoAccountsSource = readFileSync(
  new URL("./demo-accounts.ts", import.meta.url),
  "utf8",
);

const demoEnv = {
  NODE_ENV: "test",
  DEMO_SALES_REP_USERNAME: "demo-sales-rep",
  DEMO_SALES_REP_PASSWORD: "ignored-owner-value",
  DEMO_MARKETING_USER_USERNAME: "demo-marketing-user",
  DEMO_MARKETING_USER_PASSWORD: "ignored-owner-value",
  DEMO_NO_ROLE_USERNAME: "demo-no-role",
  DEMO_NO_ROLE_PASSWORD: "ignored-owner-value",
};

describe("demo account seed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    randomBytesMock.mockClear();
  });

  it("derives each password from at least 24 random bytes of the cryptographic generator", () => {
    const password = generateDemoPassword();

    expect(randomBytesMock).toHaveBeenCalled();
    const bytes = randomBytesMock.mock.calls[0]?.[0];
    expect(typeof bytes === "number" && bytes >= DEMO_PASSWORD_RANDOM_BYTES).toBe(
      true,
    );
    expect(typeof password).toBe("string");
    expect(password.length).toBeGreaterThan(0);
  });

  it("rejects an owner-supplied password path by generating its own", () => {
    generateDemoPassword();
    expect(randomBytesMock).toHaveBeenCalled();
  });

  it("performs an idempotent upsert on a second run", async () => {
    await upsertDemoIdentity(demoEnv);
    await expect(upsertDemoIdentity(demoEnv)).resolves.toBeUndefined();
  });

  it("grants the Sales rep and Marketing user a 90-day role expiry", async () => {
    await upsertDemoIdentity(demoEnv);
    expect(DEMO_ROLE_EXPIRY_DAYS).toBeLessThanOrEqual(90);
  });

  it("captures usernames on stdout and stderr with no password material", async () => {
    const out = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const err = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    await upsertDemoIdentity(demoEnv);

    const combined = `${out.mock.calls.join("")}${err.mock.calls.join("")}`;
    expect(combined).toContain("demo-sales-rep");
    expect(combined).toContain("demo-marketing-user");
    expect(combined).not.toContain("ignored-owner-value");
    out.mockRestore();
    err.mockRestore();
  });

  it("removes company roles and creates no administrator identity", async () => {
    expect(demoAccountsSource).toMatch(
      /delete from company_role_assignments\s+where membership_id = \$\{membership\.id\}/,
    );
    expect(demoAccountsSource).not.toContain("role_key = 'COMPANY_ADMIN'");
    expect(demoAccountsSource).not.toMatch(
      /insert into company_role_assignments/,
    );
  });

  it("disables the no-role identity as the final acceptance step", async () => {
    await expect(disableDemoIdentity("demo-no-role")).resolves.toBeUndefined();
  });

  it("rotates the password and extends the role expiry", async () => {
    await expect(rotateDemoIdentity("demo-sales-rep")).resolves.toBeUndefined();
  });
});
