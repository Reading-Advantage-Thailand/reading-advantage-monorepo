import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { applicationCatalogue } from "./application-catalogue";

describe("server-owned application catalogue", () => {
  it("serves the three administered applications with their role vocabulary", () => {
    expect(applicationCatalogue()).toEqual([
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
    ]);
  });

  it("reads each application host from its environment variable", () => {
    vi.stubEnv("ACCOUNTS_MARKETING_URL", "https://marketing.staging.example.test");
    vi.stubEnv("ACCOUNTS_SALES_URL", "https://sales.staging.example.test");
    vi.stubEnv("ACCOUNTS_CODECAMP_URL", "https://codecamp.staging.example.test");

    const hosts = Object.fromEntries(
      applicationCatalogue().map((application) => [application.key, application.href]),
    );

    expect(hosts).toEqual({
      marketing: "https://marketing.staging.example.test",
      sales: "https://sales.staging.example.test",
      codecamp: "https://codecamp.staging.example.test",
    });
    vi.unstubAllEnvs();
  });

  it("rejects a configured host that is not a URL", () => {
    vi.stubEnv("ACCOUNTS_SALES_URL", "not-a-url");

    expect(() => applicationCatalogue()).toThrow(z.ZodError);
    vi.unstubAllEnvs();
  });
});
