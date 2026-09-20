import { describe, expect, it } from "vitest";

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
});
