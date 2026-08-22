import { describe, expect, it } from "vitest";
import {
  createAccountingDirectConfig,
  createAccountingRuntimeConfig,
} from "../environment.js";

const RUNTIME_URL =
  "postgresql://accounting_runtime:runtime-secret@127.0.0.1:6432/accounting";
const DIRECT_URL =
  "postgresql://accounting_migrator:direct-secret@127.0.0.1:5432/accounting";

/** Captures one expected configuration error message. */
function captureError(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Expected accounting environment validation to fail.");
}

describe("accounting database environment", () => {
  it("parses separate runtime and direct URLs with a bounded runtime pool", () => {
    expect(
      createAccountingRuntimeConfig({
        ACCOUNTING_DATABASE_URL: RUNTIME_URL,
        ACCOUNTING_DATABASE_POOL_MAX: "7",
      }),
    ).toEqual({ databaseUrl: RUNTIME_URL, poolMax: 7 });
    expect(
      createAccountingDirectConfig({
        ACCOUNTING_DIRECT_DATABASE_URL: DIRECT_URL,
      }),
    ).toEqual({ directDatabaseUrl: DIRECT_URL });
  });

  it("defaults the runtime pool to 3 and accepts only integers from 1 through 20", () => {
    expect(
      createAccountingRuntimeConfig({
        ACCOUNTING_DATABASE_URL: RUNTIME_URL,
      }).poolMax,
    ).toBe(3);

    for (const poolMax of ["1", "20"]) {
      expect(
        createAccountingRuntimeConfig({
          ACCOUNTING_DATABASE_URL: RUNTIME_URL,
          ACCOUNTING_DATABASE_POOL_MAX: poolMax,
        }).poolMax,
      ).toBe(Number(poolMax));
    }
    for (const poolMax of ["0", "21", "3.5", "no", " "]) {
      expect(
        captureError(() =>
          createAccountingRuntimeConfig({
            ACCOUNTING_DATABASE_URL: RUNTIME_URL,
            ACCOUNTING_DATABASE_POOL_MAX: poolMax,
          }),
        ),
      ).toMatch(/ACCOUNTING_DATABASE_POOL_MAX|integer|1.*20/i);
    }
  });

  it("requires both URL boundaries to target exactly the accounting database", () => {
    const wrongRuntime = RUNTIME_URL.replace(/\/accounting$/, "/company_identity");
    const wrongDirect = DIRECT_URL.replace(/\/accounting$/, "/reading_advantage");

    expect(
      captureError(() =>
        createAccountingRuntimeConfig({
          ACCOUNTING_DATABASE_URL: wrongRuntime,
        }),
      ),
    ).toMatch(/pathname|accounting/i);
    expect(
      captureError(() =>
        createAccountingDirectConfig({
          ACCOUNTING_DIRECT_DATABASE_URL: wrongDirect,
        }),
      ),
    ).toMatch(/pathname|accounting/i);
  });

  it("does not fall back to generic or direct credentials for runtime configuration", () => {
    const secret = "RUNTIME_SECRET_MUST_NOT_LEAK";
    const productUrl = `postgresql://product:${secret}@localhost:5432/reading_advantage`;
    const message = captureError(() =>
      createAccountingRuntimeConfig({
        DATABASE_URL: productUrl,
        ACCOUNTING_DIRECT_DATABASE_URL: DIRECT_URL,
      }),
    );

    expect(message).toMatch(/ACCOUNTING_DATABASE_URL|required|unrecognized/i);
    expect(message).not.toContain(productUrl);
    expect(message).not.toContain(secret);
  });

  it("rejects whitespace, non-PostgreSQL protocols, fragments, and unknown keys", () => {
    for (const databaseUrl of [
      ` ${RUNTIME_URL} `,
      "https://db.example.com/accounting",
      `${RUNTIME_URL}#other`,
    ]) {
      expect(
        captureError(() =>
          createAccountingRuntimeConfig({
            ACCOUNTING_DATABASE_URL: databaseUrl,
          }),
        ),
      ).toMatch(/whitespace|postgresql|fragment/i);
    }
    expect(
      captureError(() =>
        createAccountingRuntimeConfig({
          ACCOUNTING_DATABASE_URL: RUNTIME_URL,
          ACCOUNTING_UNREVIEWED_OPTION: "true",
        }),
      ),
    ).toMatch(/unrecognized|ACCOUNTING_UNREVIEWED_OPTION/i);
  });

  it("returns frozen configuration objects", () => {
    const runtime = createAccountingRuntimeConfig({
      ACCOUNTING_DATABASE_URL: RUNTIME_URL,
    });
    const direct = createAccountingDirectConfig({
      ACCOUNTING_DIRECT_DATABASE_URL: DIRECT_URL,
    });

    expect(Object.isFrozen(runtime)).toBe(true);
    expect(Object.isFrozen(direct)).toBe(true);
    expect(Reflect.set(runtime, "poolMax", 100)).toBe(false);
  });
});
