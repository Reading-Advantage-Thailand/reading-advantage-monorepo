import { describe, expect, it } from "vitest";

import {
  DURABLE_JOB_PG16_ADMIN_URL_ENV,
  DURABLE_JOB_PG16_OPT_IN_ENV,
  isDurableJobPostgres16IntegrationEnabled,
  resolveDurableJobPostgres16AdminUrl,
} from "./postgres16-harness.js";

const SAFE_URL =
  "postgresql://durable_test:secret@127.0.0.1:55432/durable_job_test_admin_local";

describe("durable job PostgreSQL 16 harness URL guard", () => {
  it("accepts only the dedicated test URL key and namespace", () => {
    const parsed = resolveDurableJobPostgres16AdminUrl({
      [DURABLE_JOB_PG16_ADMIN_URL_ENV]: SAFE_URL,
    });

    expect(parsed.hostname).toBe("127.0.0.1");
    expect(parsed.pathname).toBe("/durable_job_test_admin_local");
  });

  it("accepts postgres aliases, IPv6 loopback, and empty generic variables", () => {
    const parsed = resolveDurableJobPostgres16AdminUrl({
      [DURABLE_JOB_PG16_ADMIN_URL_ENV]:
        "postgres://durable_test:secret@[::1]:55432/durable_job_test_admin_ipv6",
      DATABASE_URL: "",
      DIRECT_DATABASE_URL: "   ",
    });

    expect(parsed.protocol).toBe("postgres:");
    expect(parsed.hostname).toBe("[::1]");
  });

  it("fails closed when the dedicated URL is absent", () => {
    expect(() => resolveDurableJobPostgres16AdminUrl({})).toThrow(
      `${DURABLE_JOB_PG16_ADMIN_URL_ENV} is required`,
    );
  });

  it.each(["DATABASE_URL", "DIRECT_DATABASE_URL"])(
    "rejects generic %s even when the dedicated URL is safe",
    (genericKey) => {
      expect(() =>
        resolveDurableJobPostgres16AdminUrl({
          [DURABLE_JOB_PG16_ADMIN_URL_ENV]: SAFE_URL,
          [genericKey]: "postgresql://prod:secret@db.example.com/prod",
        }),
      ).toThrow(`${genericKey} must be unset`);
    },
  );

  it.each([
    "postgresql://durable_test:secret@db.example.com:5432/durable_job_test_admin_local",
    "postgresql://durable_test:secret@10.0.0.8:5432/durable_job_test_admin_local",
    "postgresql://durable_test:secret@0.0.0.0:5432/durable_job_test_admin_local",
  ])("rejects non-loopback and unsafe hosts", (url) => {
    expect(() =>
      resolveDurableJobPostgres16AdminUrl({
        [DURABLE_JOB_PG16_ADMIN_URL_ENV]: url,
      }),
    ).toThrow("loopback hostname");
  });

  it.each([
    "postgres",
    "template0",
    "template1",
    "reading_advantage",
    "primary_advantage",
    "science_advantage",
    "durable_job_test",
  ])("rejects shared or non-dedicated database name %s", (databaseName) => {
    expect(() =>
      resolveDurableJobPostgres16AdminUrl({
        [DURABLE_JOB_PG16_ADMIN_URL_ENV]:
          `postgresql://durable_test:secret@localhost:5432/${databaseName}`,
      }),
    ).toThrow("dedicated durable_job_test_admin_ database");
  });

  it.each([
    "https://durable_test:secret@localhost/durable_job_test_admin_local",
    "not a URL",
    "postgresql://durable_test:secret@localhost:5432/durable_job_test_admin_local?sslmode=require",
    "postgresql://durable_test:secret@localhost:5432/durable_job_test_admin_local#fragment",
  ])("rejects an invalid or ambiguous admin URL without leaking it", (url) => {
    let message = "";
    try {
      resolveDurableJobPostgres16AdminUrl({
        [DURABLE_JOB_PG16_ADMIN_URL_ENV]: url,
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).not.toContain("secret");
    expect(message.length).toBeGreaterThan(0);
  });

  it.each([
    "postgresql://localhost:5432/durable_job_test_admin_local",
    "postgresql://durable_test:secret@localhost:5432/parent/durable_job_test_admin_local",
    "postgresql://durable_test:secret@localhost:5432/%E0%A4%A",
  ])("rejects incomplete or malformed URL identity", (url) => {
    expect(() =>
      resolveDurableJobPostgres16AdminUrl({
        [DURABLE_JOB_PG16_ADMIN_URL_ENV]: url,
      }),
    ).toThrow();
  });
});

describe("durable job PostgreSQL 16 integration opt-in", () => {
  it("stays disabled unless explicitly opted in", () => {
    expect(isDurableJobPostgres16IntegrationEnabled({})).toBe(false);
    expect(
      isDurableJobPostgres16IntegrationEnabled({
        [DURABLE_JOB_PG16_OPT_IN_ENV]: "",
      }),
    ).toBe(false);
    expect(
      isDurableJobPostgres16IntegrationEnabled({
        [DURABLE_JOB_PG16_ADMIN_URL_ENV]: SAFE_URL,
      }),
    ).toBe(false);
  });

  it("fails when opt-in has no safe dedicated URL", () => {
    expect(() =>
      isDurableJobPostgres16IntegrationEnabled({
        [DURABLE_JOB_PG16_OPT_IN_ENV]: "1",
      }),
    ).toThrow(`${DURABLE_JOB_PG16_ADMIN_URL_ENV} is required`);
  });

  it("rejects ambiguous opt-in values", () => {
    expect(() =>
      isDurableJobPostgres16IntegrationEnabled({
        [DURABLE_JOB_PG16_OPT_IN_ENV]: "true",
        [DURABLE_JOB_PG16_ADMIN_URL_ENV]: SAFE_URL,
      }),
    ).toThrow(`${DURABLE_JOB_PG16_OPT_IN_ENV} must be exactly 1`);
  });

  it("enables only with opt-in and a safe dedicated URL", () => {
    expect(
      isDurableJobPostgres16IntegrationEnabled({
        [DURABLE_JOB_PG16_OPT_IN_ENV]: "1",
        [DURABLE_JOB_PG16_ADMIN_URL_ENV]: SAFE_URL,
      }),
    ).toBe(true);
  });
});
