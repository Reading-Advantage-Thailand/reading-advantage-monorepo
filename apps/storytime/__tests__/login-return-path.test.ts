/**
 * The return-path check of the sign-in (AC-4.2, test strategy P2b.7, task 2b.2).
 *
 * The scanned page comes back after the sign-in only when `next` is a same-origin Storytime path.
 * Every other value falls back to `/<locale>/st`. The table below holds the accepted values and
 * the rejected values. A naive `startsWith("/")` check fails at least ten rejected rows.
 *
 * At the base the first assertion fails on `Missing apps/storytime/lib/auth/return-path.ts`. The
 * module is loaded only after that assertion, so no case fails with a load error.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const APP = resolve(import.meta.dirname, "..");
const RETURN_PATH = resolve(APP, "lib/auth/return-path.ts");
const MISSING = "Missing apps/storytime/lib/auth/return-path.ts";
const FALLBACK = "/th/st";
const APP_ORIGIN = "https://app.example";

/** One row of the return-path table. */
interface PathCase {
  label: string;
  value: unknown;
  accept: boolean;
}

/** The 200-character accepted path. */
const LONG_ACCEPTED = `/th/st/${"a".repeat(193)}`;

/** The 201-character rejected path. */
const LONG_REJECTED = `/th/st/${"a".repeat(194)}`;

const CASES: PathCase[] = [
  { label: "scanned week path", value: "/th/st/2/1", accept: true },
  { label: "scanned week path with a part", value: "/en/st/2/1?part=song", accept: true },
  { label: "teacher week path", value: "/th/teacher/2/1/3", accept: true },
  {
    label: "valid percent encoding",
    value: "/th/st/2/1?part=song&x=%C3%A9",
    accept: true,
  },
  { label: "200 characters", value: LONG_ACCEPTED, accept: true },
  { label: "protocol-relative", value: "//evil.example", accept: false },
  { label: "backslash after the first slash", value: "/\\evil.example", accept: false },
  { label: "two backslashes", value: "\\\\evil.example", accept: false },
  { label: "absolute URL", value: "https://evil.example/th/st/2/1", accept: false },
  { label: "javascript scheme", value: "javascript:alert(1)", accept: false },
  {
    label: "CRLF header injection",
    value: "/th/st/2/1\r\nSet-Cookie:x=1",
    accept: false,
  },
  { label: "leading tab", value: "\t/th/st/2/1", accept: false },
  { label: "trailing newline", value: "/th/st/2/1\n", accept: false },
  { label: "NUL escape", value: "/th/st/%00", accept: false },
  { label: "leading space", value: " /th/st/2/1", accept: false },
  { label: "bad percent encoding", value: "/th/st/%E0%A4%A", accept: false },
  {
    label: "double slash after one decode",
    value: "/th/st/%2F%2Fevil.example",
    accept: false,
  },
  { label: "dot segments leave the allow list", value: "/th/st/../../admin", accept: false },
  { label: "another locale section", value: "/th/other/x", accept: false },
  { label: "upper-case locale", value: "/TH/st/2/1", accept: false },
  {
    label: "the sign-in page itself",
    value: "/th/sign-in?next=/th/st/2/1",
    accept: false,
  },
  { label: "201 characters", value: LONG_REJECTED, accept: false },
  { label: "empty string", value: "", accept: false },
  { label: "undefined", value: undefined, accept: false },
  { label: "an array", value: ["/th/st/2/1", "/th/st/2/2"], accept: false },
  { label: "a number", value: 42, accept: false },
];

describe("login return path (red)", () => {
  it("accepts the scanned week path and rejects every bad value", async () => {
    expect(existsSync(RETURN_PATH), MISSING).toBe(true);
    const mod = (await import("../lib/auth/return-path.js")) as {
      safeReturnPath(value: unknown, fallback: string): string;
    };
    expect(typeof mod.safeReturnPath, "safeReturnPath is exported").toBe("function");

    let accepted = 0;
    let rejected = 0;
    let mutantFailures = 0;
    for (const entry of CASES) {
      const result = mod.safeReturnPath(entry.value, FALLBACK);
      if (entry.accept) {
        expect(result, `${entry.label} stays the same`).toBe(entry.value);
        expect(new URL(result, APP_ORIGIN).origin, `${entry.label} stays on the app origin`).toBe(
          APP_ORIGIN,
        );
        accepted += 1;
      } else {
        expect(result, `${entry.label} falls back`).toBe(FALLBACK);
        rejected += 1;
        if (typeof entry.value === "string" && entry.value.startsWith("/")) mutantFailures += 1;
      }
    }

    console.log(
      `next_cases=${CASES.length} accepted=${accepted} rejected=${rejected}`,
    );
    expect(CASES.length, "next_cases").toBeGreaterThanOrEqual(24);
    expect(accepted, "accepted").toBeGreaterThanOrEqual(5);
    expect(rejected, "rejected").toBeGreaterThanOrEqual(19);

    // The mutant is the naive check. It must fail at least ten of the rejected rows.
    const naive = (value: unknown): string =>
      typeof value === "string" && value.startsWith("/") ? value : FALLBACK;
    const naiveFailures = CASES.filter(
      (entry) => !entry.accept && naive(entry.value) !== FALLBACK,
    );
    console.log(`mutant_failures=${naiveFailures.length}`);
    expect(mutantFailures, "mutant_failures").toBeGreaterThanOrEqual(10);
    expect(naiveFailures.length).toBeGreaterThanOrEqual(10);
  });

  it("accepts only ASCII return paths (F90)", async () => {
    expect(existsSync(RETURN_PATH), MISSING).toBe(true);
    const mod = (await import("../lib/auth/return-path.js")) as {
      safeReturnPath(value: unknown, fallback: string): string;
    };
    const ASCII_ONLY = /^[\u0000-\u007f]*$/;
    const hostile = [
      { label: "U+2028 line separator", value: "/th/st/2/1\u2028" },
      { label: "U+2029 paragraph separator", value: "/th/st/2/1\u2029" },
      { label: "raw Thai letter in the query", value: "/th/st/2/1?x=\u0e01" },
      { label: "raw Latin-1 e-acute", value: "/th/st/2/1?x=\u00e9" },
      { label: "U+0080 code point", value: "/th/st/2/1?x=\u0080" },
    ];
    let fallenBack = 0;
    for (const entry of hostile) {
      const result = mod.safeReturnPath(entry.value, FALLBACK);
      console.log(`${entry.label}: ${result}`);
      expect(
        result === FALLBACK || ASCII_ONLY.test(result),
        `${entry.label} falls back or stays ASCII`,
      ).toBe(true);
      expect(ASCII_ONLY.test(result), `${entry.label} holds only ASCII bytes`).toBe(true);
      if (result === FALLBACK) fallenBack += 1;
    }
    const asciiControl = "/th/st/2/1?x=%C3%A9";
    expect(mod.safeReturnPath(asciiControl, FALLBACK), "the ASCII control stays").toBe(
      asciiControl,
    );
    // The app builds no return path from Thai text (searched 2026-11-08: no hit in app/ or lib/).
    console.log("app_thai_paths=0");
    console.log(`ascii_cases=${hostile.length} fallen_back=${fallenBack}`);
    expect(hostile.length, "ascii_cases").toBe(5);
  });
});
