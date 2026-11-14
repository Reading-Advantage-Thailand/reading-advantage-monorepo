// @vitest-environment node
/**
 * Review B blockers B994 and B995 of Phase 7 (track storytime_app_rebuild_20261025; plan task
 * 7.9, group r3).
 *
 * B994: `docs/runbooks/storytime-deploy.md` moves traffic with `update-traffic` in two places.
 * Step 4 runs the live traffic guard first. The rollback in step 5 does not, so a rollback can
 * send the traffic to a revision that still holds a review switch. The contract: EVERY
 * `gcloud run services update-traffic` command of the runbook has, in the same step and before the
 * command, a guard command (`live-traffic-guard.ts --revision <target>`) whose revision is the
 * target of that command, and a sentence that stops the step when the guard refuses.
 *
 * B995 (part 1): `apps/storytime/review.gcloudignore` is the ignore file of the review upload. The
 * `--ignore-file` flag replaces the root `.gcloudignore`, and `.gitignore` does not apply, so the
 * file must exclude env files, keys, and credential files itself. The rows apply the rules of the
 * file (gitignore syntax: last match wins, `!` re-includes, no re-include below an ignored folder)
 * to a fake file list. The part 2 question (the scope of `packages/`) is the decision of the PM and
 * stays outside this file.
 *
 * Rows that name no control kill their own harness: the judge rows run the checks against a
 * reference input and against weak inputs, so a check that passes everything fails a row (A4).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ignore from "ignore";
import { describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const repoRoot = resolve(app, "..", "..");

/** The deploy runbook. */
const RUNBOOK = resolve(repoRoot, "docs/runbooks/storytime-deploy.md");

/** The ignore file of the review upload. */
const REVIEW_IGNORE = resolve(app, "review.gcloudignore");

/** The submit script that selects the ignore file. */
const SUBMIT = resolve(app, "scripts/review/submit-review-build.sh");

let runbookCommandsSeen = 0;
let judgeInputsChecked = 0;
let envPathsChecked = 0;

// ---------------------------------------------------------------------------------------------
// B994: the runbook scan
// ---------------------------------------------------------------------------------------------

/** Matches a traffic move command. */
const TRAFFIC_COMMAND = /gcloud\s+run\s+services\s+update-traffic/;

/** Matches the guard command and captures the revision that it checks. */
const GUARD_COMMAND = /live-traffic-guard\.ts[^\n]*--revision\s+(\S+)/;

/**
 * Joins a command line with its backslash continuation lines.
 * @param lines The runbook lines.
 * @param index The index of the first line of the command.
 * @returns The text of the whole command.
 */
function commandText(lines: string[], index: number): string {
  let text = lines[index];
  let cursor = index;
  while (lines[cursor].trimEnd().endsWith("\\") && cursor + 1 < lines.length) {
    cursor += 1;
    text += ` ${lines[cursor]}`;
  }
  return text;
}

/**
 * Finds every traffic move command of a runbook and checks the guard before it.
 * @param text The runbook text.
 * @returns One message for each rule that a command breaks, and the number of commands found.
 */
function scanTrafficCommands(text: string): { problems: string[]; commands: number } {
  const lines = text.split("\n");
  const problems: string[] = [];
  let commands = 0;
  let previousCommand = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (!TRAFFIC_COMMAND.test(lines[i])) continue;
    commands += 1;
    const label = `update-traffic command at line ${i + 1}`;
    const target = /--to-revisions=([^\s=]+)=\d+/.exec(commandText(lines, i))?.[1];
    if (!target) {
      problems.push(`${label} names no revision with --to-revisions=<revision>=<percent>`);
    }
    // The step of the command starts at the nearest numbered item or heading, and never before the
    // previous traffic command: a guard run for another command does not count.
    let start = 0;
    for (let k = i - 1; k >= 0; k -= 1) {
      if (/^(\d+\.\s|#{1,6}\s)/.test(lines[k])) {
        start = k;
        break;
      }
    }
    start = Math.max(start, previousCommand + 1);
    previousCommand = i;
    const region = lines.slice(start, i);
    const guard = region
      .filter((line) => !line.includes("--print-remove-arg"))
      .map((line) => GUARD_COMMAND.exec(line)?.[1])
      .filter((revision): revision is string => revision !== undefined);
    if (guard.length === 0) {
      problems.push(`${label} has no live-traffic-guard.ts --revision command before it in its step`);
    } else if (target && !guard.includes(target)) {
      problems.push(`${label} moves traffic to ${target}, the guard before it checks ${guard.join(", ")}`);
    }
    const prose = region
      .filter((line) => !GUARD_COMMAND.test(line) && !/^\s*(gcloud|node_modules)/.test(line))
      .join(" ")
      .replace(/\s+/g, " ");
    const stops = prose
      .split(/(?<=[.!?])\s+/)
      .some(
        (sentence) =>
          /\b(exit 1|refus\w*|fails?|failure)\b/i.test(sentence) &&
          /\b(stops?|do not move|must not move|not move the traffic)\b/i.test(sentence),
      );
    if (!stops) problems.push(`${label} has no sentence in its step that stops it when the guard refuses`);
  }
  return { problems, commands };
}

/** A runbook text that obeys the rule, the positive control of the scan. */
const GOOD_RUNBOOK = [
  "4. Move the traffic. Run the guard first. A guard failure stops the step. Do not move the",
  "   traffic after exit 1.",
  "",
  "   ```",
  "   node_modules/.bin/tsx apps/storytime/scripts/review/live-traffic-guard.ts --revision storytime-app-<revision>",
  "   ```",
  "",
  "   ```",
  "   gcloud run services update-traffic storytime-app --project p --region r --to-revisions=storytime-app-<revision>=100",
  "   ```",
  "",
  "5. Rollback. Run the guard against the previous revision. A guard failure stops the rollback.",
  "   Do not move the traffic after exit 1.",
  "",
  "   ```",
  "   node_modules/.bin/tsx apps/storytime/scripts/review/live-traffic-guard.ts --revision <previous-revision>",
  "   ```",
  "",
  "   ```",
  "   gcloud run services update-traffic storytime-app --project p --region r --to-revisions=<previous-revision>=100",
  "   ```",
  "",
].join("\n");

/** The rollback step of the control, as the runbook holds it at the Red base (no guard). */
const ROLLBACK_GUARD_BLOCK = [
  "   ```",
  "   node_modules/.bin/tsx apps/storytime/scripts/review/live-traffic-guard.ts --revision <previous-revision>",
  "   ```",
  "",
].join("\n");

const ROLLBACK_STOP_SENTENCE =
  "5. Rollback. Run the guard against the previous revision. A guard failure stops the rollback.\n   Do not move the traffic after exit 1.\n";

describe("P7 r3 B994: every update-traffic command has its own guard (the runbook)", () => {
  const runbook = (): string => readFileSync(RUNBOOK, "utf8");

  it("g1 every update-traffic command of the runbook has a guard for its target and a stop rule", () => {
    const { problems, commands } = scanTrafficCommands(runbook());
    runbookCommandsSeen = commands;
    expect(commands, "the runbook must hold at least step 4 and the rollback").toBeGreaterThanOrEqual(2);
    expect(problems, `update_traffic_commands=${commands} problems=${problems.length}`).toEqual([]);
  });

  it("g2 the rollback command is one of the commands that carry the guard", () => {
    const lines = runbook().split("\n");
    const rollback = lines.findIndex(
      (line) => TRAFFIC_COMMAND.test(line) && line.includes("<previous-revision>"),
    );
    expect(rollback, "the runbook must hold the rollback update-traffic command").toBeGreaterThanOrEqual(0);
    let step = 0;
    for (let k = rollback - 1; k >= 0; k -= 1) {
      if (/^\d+\.\s/.test(lines[k])) {
        step = k;
        break;
      }
    }
    const guards = lines
      .slice(step, rollback)
      .map((line) => GUARD_COMMAND.exec(line)?.[1])
      .filter((revision): revision is string => revision !== undefined);
    expect(guards, "the rollback step must run the guard against <previous-revision>").toContain(
      "<previous-revision>",
    );
  });

  describe("judge rows: the scan kills its mutants", () => {
    it("j0 the control runbook passes the scan with two commands", () => {
      judgeInputsChecked += 1;
      const { problems, commands } = scanTrafficCommands(GOOD_RUNBOOK);
      expect(commands).toBe(2);
      expect(problems).toEqual([]);
    });

    const mutants: Array<[string, string]> = [
      ["j1 a rollback with no guard (the base runbook)", GOOD_RUNBOOK.replace(ROLLBACK_GUARD_BLOCK, "")],
      [
        "j2 a rollback guard for another revision",
        GOOD_RUNBOOK.replace(ROLLBACK_GUARD_BLOCK, ROLLBACK_GUARD_BLOCK.replace("<previous-revision>", "storytime-app-<revision>")),
      ],
      [
        "j3 a rollback with only the print-remove-arg command",
        GOOD_RUNBOOK.replace(ROLLBACK_GUARD_BLOCK, ROLLBACK_GUARD_BLOCK.replace("--revision <previous-revision>", "--print-remove-arg")),
      ],
      [
        "j4 a rollback with a guard and no stop sentence",
        GOOD_RUNBOOK.replace(ROLLBACK_STOP_SENTENCE, "5. Rollback. Run the guard against the previous revision.\n"),
      ],
      [
        "j5 a rollback whose guard comes after the command",
        `${GOOD_RUNBOOK.replace(ROLLBACK_GUARD_BLOCK, "")}\n${ROLLBACK_GUARD_BLOCK}`,
      ],
      [
        "j6 a third command in a new step with no guard (the scan reads all commands)",
        `${GOOD_RUNBOOK}\n6. Send all traffic back.\n\n   \`\`\`\n   gcloud run services update-traffic storytime-app --project p --region r --to-revisions=other=100\n   \`\`\`\n`,
      ],
      [
        "j7 a command with no named revision (--to-latest cannot be guarded)",
        GOOD_RUNBOOK.replace("--to-revisions=<previous-revision>=100", "--to-latest"),
      ],
      [
        "j8 step 4 with no guard while the rollback has one",
        GOOD_RUNBOOK.replace(
          "   node_modules/.bin/tsx apps/storytime/scripts/review/live-traffic-guard.ts --revision storytime-app-<revision>\n",
          "",
        ),
      ],
      [
        "j9 a rollback command with a backslash continuation and no guard",
        GOOD_RUNBOOK.replace(ROLLBACK_GUARD_BLOCK, "").replace(
          "storytime-app --project p --region r --to-revisions=<previous-revision>=100",
          "storytime-app \\\n     --project p --region r \\\n     --to-revisions=<previous-revision>=100",
        ),
      ],
    ];
    for (const [name, text] of mutants) {
      it(`${name} fails the scan`, () => {
        judgeInputsChecked += 1;
        expect(text, "the mutant must differ from the control").not.toBe(GOOD_RUNBOOK);
        const { problems } = scanTrafficCommands(text);
        expect(problems.length, "the scan must report a problem").toBeGreaterThan(0);
      });
    }
  });
});

// ---------------------------------------------------------------------------------------------
// B995 part 1: the env exclusion of the review upload
// ---------------------------------------------------------------------------------------------

/** Env files that must never enter the upload. */
const ENV_PATHS = [
  "apps/storytime/.env",
  "apps/storytime/.env.local",
  "apps/storytime/.env.production",
  "apps/storytime/app/.env",
  "packages/db/.env",
  "packages/db/.env.local",
  ".env",
  ".env.local",
];

/** Key and credential files that must never enter the upload. */
const SECRET_PATHS = [
  "apps/storytime/certs/server.pem",
  "packages/db/private.key",
  "apps/storytime/credentials.json",
  "packages/db/credentials-prod.json",
  "packages/auth/keys/signing.pem",
];

/** Source files that the upload must keep: the check must not exclude everything (A7). */
const KEEP_PATHS = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  "apps/storytime/app/page.tsx",
  "apps/storytime/content/l2/w01.json",
  "apps/storytime/lib/env.ts",
  "apps/storytime/lib/environment.ts",
  "apps/storytime/content/keynote.md",
  "packages/read-along/hooks/use-read-along.ts",
  "packages/db/src/credentials-guide.md",
  "packages/db/package.json",
];

/** Paths that the file already excludes today (characterization). */
const EXCLUDED_TODAY = [
  "apps/storytime/node_modules/x/index.js",
  "apps/storytime/.next/server/app.js",
  "packages/db/node_modules/x/index.js",
  "apps/accounting/app/page.tsx",
  "scripts/deploy.sh",
];

/**
 * Applies ignore rules to a file list with the gitignore semantics of gcloudignore.
 * @param rules The text of an ignore file.
 * @param files The relative paths to test.
 * @returns The paths that the upload keeps.
 */
function keptBy(rules: string, files: string[]): string[] {
  const filter = ignore().add(rules);
  return files.filter((path) => !filter.ignores(path));
}

/**
 * Runs the four checks of the contract against one ignore file text.
 * @param rules The text of an ignore file.
 * @returns One message for each rule that the text breaks.
 */
function checkUploadRules(rules: string): string[] {
  const problems: string[] = [];
  const keptEnv = keptBy(rules, ENV_PATHS);
  if (keptEnv.length > 0) problems.push(`env files enter the upload: ${keptEnv.join(", ")}`);
  const keptSecret = keptBy(rules, SECRET_PATHS);
  if (keptSecret.length > 0) problems.push(`key or credential files enter the upload: ${keptSecret.join(", ")}`);
  const droppedSource = KEEP_PATHS.filter((path) => !keptBy(rules, [path]).includes(path));
  if (droppedSource.length > 0) problems.push(`source files leave the upload: ${droppedSource.join(", ")}`);
  const keptOutside = keptBy(rules, EXCLUDED_TODAY);
  if (keptOutside.length > 0) problems.push(`paths outside the image enter the upload: ${keptOutside.join(", ")}`);
  return problems;
}

describe("P7 r3 B995 part 1: the review upload excludes env, key, and credential files", () => {
  const rules = (): string => readFileSync(REVIEW_IGNORE, "utf8");

  it("u0 the review build submits with this ignore file (the file under test is the file in use)", () => {
    expect(readFileSync(SUBMIT, "utf8")).toContain("--ignore-file=apps/storytime/review.gcloudignore");
  });

  it("u1 the ignore rules drop every env file below the re-included trees", () => {
    envPathsChecked = ENV_PATHS.length;
    expect(keptBy(rules(), ENV_PATHS), "these env files would enter the Cloud Build source").toEqual([]);
  });

  it("u2 the ignore rules drop key and credential files", () => {
    expect(keptBy(rules(), SECRET_PATHS), "these key or credential files would enter the source").toEqual([]);
  });

  it("u3 the ignore rules keep the source files that the image needs (positive control)", () => {
    const kept = keptBy(rules(), KEEP_PATHS);
    expect(kept.sort(), "an exclusion is too broad when it drops a source file").toEqual([...KEEP_PATHS].sort());
  });

  it("u4 the ignore rules still drop the paths outside the image (characterization)", () => {
    expect(keptBy(rules(), EXCLUDED_TODAY)).toEqual([]);
  });

  describe("judge rows: the check kills its mutants", () => {
    const BASE = readFileSync(REVIEW_IGNORE, "utf8")
      .split("\n")
      .filter((line) => !/^\*\*\/(\.env|\*\.pem|\*\.key|credentials)/.test(line))
      .join("\n");
    const REFERENCE = `${BASE.trimEnd()}\n**/.env\n**/.env.*\n**/*.pem\n**/*.key\n**/credentials*.json\n`;

    it("j0 a reference file with the five rules passes every check", () => {
      judgeInputsChecked += 1;
      expect(checkUploadRules(REFERENCE)).toEqual([]);
    });

    const mutants: Array<[string, string]> = [
      ["j1 the base file with no new rule", BASE],
      ["j2 an env rule anchored to the root", `${BASE.trimEnd()}\n/.env\n/.env.*\n**/*.pem\n**/*.key\n**/credentials*.json\n`],
      ["j3 an env rule without the .env.* form", `${BASE.trimEnd()}\n**/.env\n**/*.pem\n**/*.key\n**/credentials*.json\n`],
      ["j4 env rules without the key and credential rules", `${BASE.trimEnd()}\n**/.env\n**/.env.*\n`],
      ["j5 a rule that drops every json file", `${REFERENCE}**/*.json\n`],
      ["j6 a rule that drops every file with env in the name", `${REFERENCE}**/*env*\n`],
    ];
    for (const [name, text] of mutants) {
      it(`${name} fails the check`, () => {
        judgeInputsChecked += 1;
        expect(text, "the mutant must differ from the reference").not.toBe(REFERENCE);
        expect(checkUploadRules(text).length, "the check must report a problem").toBeGreaterThan(0);
      });
    }
  });
});

describe("P7 r3 floors (A4)", () => {
  it("f1 the rows ran against real inputs", () => {
    expect(runbookCommandsSeen, "runbook commands scanned").toBeGreaterThanOrEqual(2);
    expect(envPathsChecked, "env paths checked").toBeGreaterThanOrEqual(8);
    expect(judgeInputsChecked, "judge inputs checked").toBeGreaterThanOrEqual(16);
  });
});
