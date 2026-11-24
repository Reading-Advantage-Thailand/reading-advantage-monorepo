import { describe, expect, it } from "vitest";
import {
  expectKeysInDictionary,
  expectKeysInEveryLocale,
} from "./fixtures/locale-key-check";

/**
 * Adversarial probes for the locale-key-check fixture.
 * Each probe fails when the helper lets a false pass through.
 */

describe("locale-key-check adversarial probes", () => {
  it("fails on a missing dotted key", () => {
    expect(() =>
      expectKeysInDictionary({ a: { b: "x" } }, "en", ["a.missing"]),
    ).toThrow();
  });

  it("fails on an empty-string value and on a whitespace value", () => {
    expect(() =>
      expectKeysInDictionary({ a: { b: "" } }, "en", ["a.b"]),
    ).toThrow();
    expect(() =>
      expectKeysInDictionary({ a: { b: "   " } }, "en", ["a.b"]),
    ).toThrow();
  });

  it("fails on an empty key list", () => {
    expect(() => expectKeysInDictionary({ a: {} }, "en", [])).toThrow();
    expect(() => expectKeysInEveryLocale([])).toThrow();
  });

  it("fails on a non-string leaf", () => {
    expect(() =>
      expectKeysInDictionary({ a: { b: 5 } }, "en", ["a.b"]),
    ).toThrow();
    expect(() =>
      expectKeysInDictionary({ a: { b: null } }, "en", ["a.b"]),
    ).toThrow();
    expect(() => expectKeysInDictionary({ a: {} }, "en", ["a"])).toThrow();
  });

  it("passes a key that exists in every shipped locale", () => {
    expectKeysInEveryLocale(["pages.contact.social.tiktok"]);
  });

  it("fails a key that is missing from a shipped locale", () => {
    expect(() =>
      expectKeysInEveryLocale(["pages.nonexistent.probe.key"]),
    ).toThrow();
  });
});
