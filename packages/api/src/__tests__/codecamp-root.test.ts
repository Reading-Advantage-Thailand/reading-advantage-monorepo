import { describe, expect, it } from "vitest";

import { codecampAppRouter } from "../codecamp-root.js";

describe("Codecamp application router inventory", () => {
  it("exposes only Codecamp product and durable activity capabilities", () => {
    const namespaces = Object.keys(codecampAppRouter._def.record);

    expect(namespaces).toEqual(["codecamp", "activity"]);
    expect(namespaces).not.toEqual(
      expect.arrayContaining(["students", "classes", "users", "auth"]),
    );
  });
});
