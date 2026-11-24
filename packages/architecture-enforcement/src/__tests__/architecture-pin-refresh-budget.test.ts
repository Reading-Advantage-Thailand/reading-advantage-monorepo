import { describe, expect, it } from "vitest";
import { parsePinRefreshArguments } from "../architecture-pin-refresh-cli.js";

/**
 * Contract test for the pin refresh budget value of Review C N2.
 *
 * The `--budget-s` flag is supported. An invalid value must name the value
 * and the rule, not report an unsupported argument.
 */

const REPO_ROOT = "/repo";

/** Parses one argument list and returns its rejection message. */
function rejectionMessage(args: readonly string[]): string {
  try {
    parsePinRefreshArguments(args, REPO_ROOT, () => REPO_ROOT);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("pin refresh budget argument (C N2)", () => {
  it("names the invalid budget value", () => {
    for (const value of ["0", "-5", "1.5", "abc"]) {
      const message = rejectionMessage(["--budget-s", value]);
      expect(
        message,
        `the message must name the value: value=${value} message=${message}`,
      ).toContain(`--budget-s must be a positive whole number of seconds: ${value}`);
      expect(
        message,
        `the message must not report an unsupported argument: value=${value} message=${message}`,
      ).not.toContain("Unsupported architecture pin refresh argument");
    }
  });

  it("names the missing budget value", () => {
    const message = rejectionMessage(["--budget-s"]);
    expect(
      message,
      `the message must name the missing value: message=${message}`,
    ).toContain("--budget-s requires a value");
  });

  it("keeps the unsupported argument message for an unknown flag", () => {
    const message = rejectionMessage(["--not-a-flag"]);
    expect(
      message,
      `the message must name the unknown flag: message=${message}`,
    ).toContain("Unsupported architecture pin refresh argument: --not-a-flag");
  });

  it("accepts a whole number of seconds", () => {
    const parsed = parsePinRefreshArguments(
      ["--budget-s", "900"],
      REPO_ROOT,
      () => REPO_ROOT,
    );
    expect(
      parsed.budgetSeconds,
      `budget_seconds=${String(parsed.budgetSeconds)}`,
    ).toBe(900);
  });
});
