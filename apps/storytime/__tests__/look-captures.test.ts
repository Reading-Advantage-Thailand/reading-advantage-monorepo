/**
 * Task 2.2: the 24 captures of AC-2.2 (strategy P2.2 `look-captures`; P2.4 rows 1 and 8).
 *
 * The browser gate `look-phase2-browser-gate.sh` holds three arrays: `SCREENS`, `VIEWPORTS`, and
 * `LOCALES`. Their product is the capture count. This test parses the arrays of the script, asserts
 * `screens_n=4`, `viewports_n=3`, `locales_n=2`, and `captures=24`, and asserts that the script
 * prints `captures=<n>` and fails when the count differs from 24. It also asserts that the script
 * names the four extra rows (`question`, `not_found`, `sign_in`, `join`).
 *
 * The test reads the script as text. It never runs the browser; the script run is the gate.
 * At the base the script is not committed (task 2.2b), so every case fails with
 * `Missing look-phase2-browser-gate.sh`. The mutant cases test the checks and pass.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const scriptPath = resolve(app, "__tests__/look-phase2-browser-gate.sh");

/**
 * Reads one bash array assignment of the form `NAME=(a b c)`.
 * @param script The script text.
 * @param name The array name.
 * @returns The words, or `null` when the script has no such array.
 */
function readArray(script: string, name: string): string[] | null {
  const match = new RegExp(`^${name}=\\(([^)]*)\\)`, "m").exec(script);
  if (!match) return null;
  return match[1]!
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/^["']|["']$/g, ""));
}

/**
 * Parses the capture arrays and the count guard of the gate script.
 * @param script The script text.
 * @returns The parsed values and the violations.
 */
function parseGate(script: string): {
  screens: string[];
  viewports: string[];
  locales: string[];
  captures: number;
  violations: string[];
} {
  const violations: string[] = [];
  const screens = readArray(script, "SCREENS") ?? [];
  const viewports = readArray(script, "VIEWPORTS") ?? [];
  const locales = readArray(script, "LOCALES") ?? [];
  const captures = screens.length * viewports.length * locales.length;
  if (screens.join(",") !== "week,reader,song,decodable") violations.push(`screens_n=${screens.length} (${screens.join(",")})`);
  if (viewports.join(",") !== "390x844,1024x768,844x390") violations.push(`viewports_n=${viewports.length} (${viewports.join(",")})`);
  if (locales.join(",") !== "th,en") violations.push(`locales_n=${locales.length} (${locales.join(",")})`);
  if (captures !== 24) violations.push(`captures=${captures}`);
  if (!/echo\s+"captures=\$\{?CAPTURES\}?"/.test(script)) violations.push("the script does not print captures=<n>");
  if (!/\[\s+"\$\{?CAPTURES\}?"\s+-ne\s+24\s+\]/.test(script)) violations.push("the script has no guard against a count other than 24");
  const extra = readArray(script, "EXTRA_ROWS") ?? [];
  for (const name of ["question", "not_found", "sign_in", "join"]) {
    if (!extra.includes(name)) violations.push(`EXTRA_ROWS lacks ${name}`);
  }
  return { screens, viewports, locales, captures, violations };
}

/**
 * Reads the gate script with a named assertion when it is absent.
 * @returns The script text.
 */
function readScript(): string {
  expect(existsSync(scriptPath), "Missing look-phase2-browser-gate.sh").toBe(true);
  return readFileSync(scriptPath, "utf8");
}

/** A script fragment that obeys every rule of the parser. */
const GOOD_SCRIPT = `
SCREENS=(week reader song decodable)
VIEWPORTS=(390x844 1024x768 844x390)
LOCALES=(th en)
EXTRA_ROWS=(question not_found sign_in join)
CAPTURES=$(( \${#SCREENS[@]} * \${#VIEWPORTS[@]} * \${#LOCALES[@]} ))
echo "captures=$CAPTURES"
if [ "$CAPTURES" -ne 24 ]; then fail "capture count"; fi
`;

describe("the 24 captures of the browser gate (AC-2.2)", () => {
  it("the gate script lists four screens, three viewports, and two locales", () => {
    const parsed = parseGate(readScript());
    expect(`screens_n=${parsed.screens.length}`).toBe("screens_n=4");
    expect(`viewports_n=${parsed.viewports.length}`).toBe("viewports_n=3");
    expect(`locales_n=${parsed.locales.length}`).toBe("locales_n=2");
    expect(`captures=${parsed.captures}`).toBe("captures=24");
  });

  it("the gate script prints captures=<n>, guards the count, and names the extra rows", () => {
    expect(parseGate(readScript()).violations).toEqual([]);
  });

  it("the parser accepts the good fragment and counts 24 (self-test)", () => {
    const parsed = parseGate(GOOD_SCRIPT);
    expect(parsed.violations).toEqual([]);
    expect(parsed.captures).toBe(24);
  });

  it("a script with two viewports counts 16 and fails (self-test)", () => {
    const two = GOOD_SCRIPT.replace("VIEWPORTS=(390x844 1024x768 844x390)", "VIEWPORTS=(390x844 844x390)");
    const parsed = parseGate(two);
    expect(`captures=${parsed.captures}`).toBe("captures=16");
    expect(parsed.violations).not.toEqual([]);
  });

  it("a script with no count guard, and a script with no extra rows, fail (self-test)", () => {
    const noGuard = GOOD_SCRIPT.replace('if [ "$CAPTURES" -ne 24 ]; then fail "capture count"; fi', "");
    expect(parseGate(noGuard).violations.join(" ")).toContain("guard");
    const noExtra = GOOD_SCRIPT.replace("EXTRA_ROWS=(question not_found sign_in join)", "EXTRA_ROWS=(question)");
    expect(parseGate(noExtra).violations.join(" ")).toContain("not_found");
  });
});
