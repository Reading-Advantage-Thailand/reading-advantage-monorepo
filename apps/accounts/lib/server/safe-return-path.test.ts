import { describe, expect, it } from "vitest";

import { isSafeReturnTo } from "./safe-return-path";

describe("isSafeReturnTo", () => {
  it("accepts a leading-slash pathname with no query", () => {
    expect(isSafeReturnTo("/", "")).toBe(true);
    expect(isSafeReturnTo("/admin", "")).toBe(true);
  });

  it("accepts a leading-slash pathname with a well-formed query", () => {
    expect(isSafeReturnTo("/admin", "?tab=users")).toBe(true);
  });

  it("rejects a protocol-relative pathname", () => {
    expect(isSafeReturnTo("//evil.example.com", "")).toBe(false);
  });

  it("rejects a pathname that carries a literal backslash", () => {
    expect(isSafeReturnTo("/\\evil.example.com", "")).toBe(false);
  });

  it("rejects a pathname that carries a question mark or fragment", () => {
    expect(isSafeReturnTo("/page?x=1", "")).toBe(false);
    expect(isSafeReturnTo("/page#frag", "")).toBe(false);
  });

  it("rejects a pathname that carries a control character", () => {
    expect(isSafeReturnTo("/page\nname", "")).toBe(false);
    expect(isSafeReturnTo("/page\tname", "")).toBe(false);
  });

  it("rejects a query that begins with two question marks", () => {
    expect(isSafeReturnTo("/page", "??x=1")).toBe(false);
  });

  it("rejects a query that carries a fragment", () => {
    expect(isSafeReturnTo("/page", "?x#frag")).toBe(false);
  });

  it("rejects a query that carries a control character", () => {
    expect(isSafeReturnTo("/page", "?x=1\n")).toBe(false);
  });

  it("rejects a query that carries a literal backslash", () => {
    expect(isSafeReturnTo("/page", "?x=\\evil")).toBe(false);
  });

  it("rejects a value longer than 2,048 characters", () => {
    const longPath = `/${"a".repeat(2_049)}`;
    expect(isSafeReturnTo(longPath, "")).toBe(false);
  });
});