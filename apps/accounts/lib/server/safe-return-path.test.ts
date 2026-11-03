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
describe("isSafeReturnTo query and encoding edges", () => {
  it("rejects a pathname that does not start with a slash", () => {
    expect(isSafeReturnTo("https://evil.example.com", "")).toBe(false);
    expect(isSafeReturnTo("evil.example.com", "")).toBe(false);
    expect(isSafeReturnTo("", "")).toBe(false);
  });

  it("rejects a non-empty query without a leading question mark", () => {
    expect(isSafeReturnTo("/page", "x=1")).toBe(false);
  });

  it("rejects a query with malformed percent encoding", () => {
    expect(isSafeReturnTo("/page", "?x=%E0%A4%A")).toBe(false);
    expect(isSafeReturnTo("/page", "?x=%zz")).toBe(false);
  });

  it("accepts a query with well-formed percent encoding", () => {
    expect(isSafeReturnTo("/api/oidc/authorize", "?redirect_uri=https%3A%2F%2Flms.example.test")).toBe(true);
  });

  it("rejects a query carrying the delete control character", () => {
    expect(isSafeReturnTo("/page", "?x=\u007f")).toBe(false);
  });

  it("counts the query toward the 2,048 character limit", () => {
    const path = `/${"a".repeat(1_023)}`;
    expect(isSafeReturnTo(path, `?${"b".repeat(1_023)}`)).toBe(true);
    expect(isSafeReturnTo(path, `?${"b".repeat(1_024)}`)).toBe(false);
  });
});
