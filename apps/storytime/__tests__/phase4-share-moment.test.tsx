// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import weekJson from "../content/l2/w01.json";
import w08Json from "../content/l2/w08.json";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/**
 * The Red tests of the share moment of the teacher lesson flow (plan task 4.6a, rule D23,
 * open questions 7, 8, and 9 of the test strategy).
 *
 * The shipped milestone week `apps/storytime/content/l2/w01.json` holds `scripts[].share` on
 * all five days:
 *
 * | Day | Shots | The step of the day |
 * |---|---|---|
 * | 1 | A3 video | A3 |
 * | 2 | B5 video | B5 |
 * | 3 | C4 video | C4 |
 * | 4 | D4 photo, D5 video | D4, D5 |
 * | 5 | D6 video | D6 is not a step of day 5 (its steps are E1 to E5) |
 *
 * Counts on the shipped file: `shares_parsed=5`, `share_shots=6`, `share_resolved=5`,
 * `share_unresolved=1`.
 *
 * Contract for Green:
 *
 * 1. `apps/storytime/lib/contracts/week.ts` exports `shareSchema` and `shareShotSchema`, and the
 *    module `scriptSchema` holds `share: shareSchema.optional()`. The share object and the shot
 *    object are both strict. A shot is `{ step: string, media: "photo" | "video" }` and holds no
 *    file path. A share is `{ shots: 1 or 2 shots, caption: biText }`. `caption.en` is not empty,
 *    and `caption.th` may be empty.
 *
 * 2. `apps/storytime/lib/share-moment.ts` exports `SHARE_CONSENT_LINE` with `en` and `th` text.
 *    The line is one app constant for parents. The tests check that both texts exist and differ,
 *    not the words (open question 8).
 *
 * 3. `TeacherLessonFlow` shows the moment only when `loopsApproved(week)` is true. The gate is the
 *    approval only, not the loops level rule (open question 9): an approved level 1 week and an
 *    approved review week show the moment.
 *
 * 4. A shot shows only at a step of its own day. A shot that names a step that the day does not
 *    hold shows nowhere. The app adds no cross-day fallback (open question 7). On the shipped file
 *    day 5 shows no moment.
 *
 * 5. The moment of a step carries `data-share-moment={step.id}`, `data-share-media` equal to
 *    `"photo"` or `"video"`, and an element with `data-share-label` whose text differs between a
 *    photo shot and a video shot. The moment shows the caption in the active language
 *    (`caption.th` when the Thai toggle is on and `caption.th` is not empty, and `caption.en`
 *    otherwise) and the consent line in the active language.
 *
 * 6. The teacher app sends no upload: no `fetch`, no `XMLHttpRequest`, no `navigator.sendBeacon`,
 *    no `input[type=file]`, no `capture` attribute, and no `form`. The source holds no `FormData`,
 *    no `multipart`, no `type="file"`, no `"use server"`, and no `sendBeacon`.
 *
 * Every count is a labeled integer that the test parses (A3): `shares_parsed`, `share_shots`,
 * `share_resolved`, `share_unresolved`, `share_shown_day1`, `share_shown_day4`,
 * `share_shown_day5`, `share_shown_level1`, `share_shown_review`, `share_shown_draft`,
 * `share_shown_total`, `screens`, `network_calls`, `file_inputs`, `capture_attributes`, `forms`,
 * `upload_hits`, `files_scanned`, `control_hits`, and `share_days`. A list is never empty before a
 * detail is asserted (A4). Each "shows nothing" case follows a positive control. A case that
 * passes at HEAD is named as a characterization. The test reads the shipped week and never a
 * fixture.
 */

/** The accessible name of the forward control of the lesson flow. */
const NEXT_STEP = "Next step";

/** The accessible name of the Thai toggle of the lesson flow. */
const THAI_TOGGLE = "ไทย";

/** The five days of the week contract. */
const DAYS = [1, 2, 3, 4, 5] as const;

/** The shipped milestone week, parsed with the app contract. */
const week: StorytimeWeek = weekSchema.parse(weekJson) as StorytimeWeek;

/** The shipped review week, parsed with the app contract. */
const reviewWeek: StorytimeWeek = weekSchema.parse(w08Json) as StorytimeWeek;

/** The English and Thai text of a consent line or a caption. */
interface Bilingual {
  /** The English text. */
  en: string;
  /** The Thai text. */
  th: string;
}

/** One shot of a share moment. */
interface ShareShot {
  /** The step id of the shot. */
  step: string;
  /** The kind of the media. */
  media: "photo" | "video";
}

/** The share object of one lesson day. */
interface Share {
  /** One or two shots. */
  shots: ShareShot[];
  /** The caption for parents. */
  caption: Bilingual;
}

/** One script of a week, with the share field of the task. */
type ScriptWithShare = StorytimeWeek["scripts"][number] & { share?: Share };

/** A week whose scripts hold the share field. */
type WeekWithShare = StorytimeWeek & { scripts: ScriptWithShare[] };

/** The props of the lesson flow. */
interface LessonFlowProps {
  /** The week of the lesson day. */
  week: StorytimeWeek;
  /** The lesson day, 1 to 5. */
  day: number;
  /** The locale segment of the route. */
  locale: string;
  /** The signed media URL of each file name. */
  mediaUrls?: Record<string, string>;
}

/** The shape of the share schema that Green must export. */
interface ShareSchema {
  /** Parses one share object. */
  safeParse: (value: unknown) => {
    success: boolean;
    error?: { issues: Array<{ path: Array<string | number>; message: string }> };
  };
}

/** The labels of the source scan. */
const UPLOAD_TOKENS = ["FormData", "multipart", 'type="file"', '"use server"', "sendBeacon"];

/** One published label of a count. */
function label(name: string, value: number): string {
  return `${name}=${value}`;
}

/** Returns a week as a week with the share field. */
function weekWithShare(source: StorytimeWeek): WeekWithShare {
  return source as unknown as WeekWithShare;
}

/** Returns the script of one day, with a named guard for a missing day. */
function scriptOf(source: StorytimeWeek, day: number): ScriptWithShare {
  const script = weekWithShare(source).scripts.find((entry) => entry.day === day);
  expect(script, `the shipped week must hold the lesson of day ${day}`).toBeDefined();
  if (!script) throw new Error(`the week holds no lesson for day ${day}`);
  expect(
    script.steps.length,
    `day=${day} steps=${script.steps.length}: every day must hold at least one step`,
  ).toBeGreaterThan(0);
  return script;
}

/** Returns the share object of one day, with a named guard. */
function shareOf(source: StorytimeWeek, day: number): Share {
  const share = scriptOf(source, day).share;
  expect(
    share,
    `day=${day}: the shipped week must hold scripts[].share for the share case`,
  ).toBeDefined();
  if (!share) throw new Error(`the week holds no share for day ${day}`);
  return share;
}

/** Lists the shots of the week with their day. */
function shotsOf(source: StorytimeWeek): Array<{ day: number; shot: ShareShot }> {
  return weekWithShare(source).scripts.flatMap((script) =>
    (script.share?.shots ?? []).map((shot) => ({ day: script.day, shot })),
  );
}

/** Deep-clones the shipped week and approves the loops part, then checks the contract (A4). */
function approvedClone(source: StorytimeWeek = week): WeekWithShare {
  const copy = structuredClone(source) as WeekWithShare;
  copy.approval = {
    ...(copy.approval ?? {}),
    loops: { status: "approved", date: "2026-11-10", words: "test clone" },
  };
  expect(
    weekSchema.safeParse(copy).success,
    "the approved clone must pass weekSchema before it renders (A4)",
  ).toBe(true);
  return copy;
}

/** Loads the week contract module and reports a missing module as an assertion. */
async function loadWeekContract(): Promise<Record<string, unknown>> {
  const modulePath = "../lib/contracts/week";
  try {
    return (await import(/* @vite-ignore */ modulePath)) as Record<string, unknown>;
  } catch (error) {
    expect(
      error,
      "Storytime must load lib/contracts/week.ts with the share schema of task 4.6a",
    ).toBeUndefined();
    throw error;
  }
}

/** Loads `shareSchema` from the week contract and fails with a named assertion when absent. */
async function loadShareSchema(): Promise<ShareSchema> {
  const module = await loadWeekContract();
  const schema = module.shareSchema;
  expect(
    typeof schema,
    "lib/contracts/week.ts must export shareSchema: a strict share object with 1 or 2 strict shots and a caption",
  ).toBe("object");
  if (!schema || typeof (schema as { safeParse?: unknown }).safeParse !== "function") {
    throw new Error("lib/contracts/week.ts must export shareSchema with safeParse");
  }
  return schema as ShareSchema;
}

/** Loads the consent line and fails with a named assertion when the module is absent. */
async function loadConsentLine(): Promise<Bilingual> {
  const modulePath = "../lib/share-moment";
  let module: Record<string, unknown>;
  try {
    module = (await import(/* @vite-ignore */ modulePath)) as Record<string, unknown>;
  } catch (error) {
    expect(
      error,
      "Storytime must add lib/share-moment.ts with SHARE_CONSENT_LINE for the share moment",
    ).toBeUndefined();
    throw error;
  }
  const line = module.SHARE_CONSENT_LINE as { en?: unknown; th?: unknown } | undefined;
  expect(
    typeof line,
    "lib/share-moment.ts must export SHARE_CONSENT_LINE with en and th text",
  ).toBe("object");
  expect(typeof line?.en, "SHARE_CONSENT_LINE.en must be a string").toBe("string");
  expect(typeof line?.th, "SHARE_CONSENT_LINE.th must be a string").toBe("string");
  return { en: line!.en as string, th: line!.th as string };
}

/** Loads the lesson flow and fails with a named assertion when the export is absent. */
async function loadLessonFlow(): Promise<ComponentType<LessonFlowProps>> {
  const modulePath = "../app/[locale]/teacher/[level]/[week]/[day]/lesson-flow";
  let module: Record<string, unknown>;
  try {
    module = (await import(/* @vite-ignore */ modulePath)) as Record<string, unknown>;
  } catch (error) {
    expect(
      error,
      "Storytime must load app/[locale]/teacher/[level]/[week]/[day]/lesson-flow.tsx exporting TeacherLessonFlow",
    ).toBeUndefined();
    throw error;
  }
  const flow = module.TeacherLessonFlow;
  expect(
    typeof flow,
    "the day module must export TeacherLessonFlow for the share moment",
  ).toBe("function");
  return flow as ComponentType<LessonFlowProps>;
}

/** Renders the lesson flow of one day. */
async function renderFlow(day: number, source: StorytimeWeek) {
  const TeacherLessonFlow = await loadLessonFlow();
  return render(<TeacherLessonFlow week={source} day={day} locale="en" />);
}

/** Returns the share moment nodes of a container. */
function momentNodes(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-share-moment]"));
}

/**
 * Renders one day and walks every screen.
 * @param day The lesson day.
 * @param source The week.
 * @param visit The action on each screen, before the forward click.
 */
async function walkDay(
  day: number,
  source: StorytimeWeek,
  visit: (state: { container: HTMLElement; step: ScriptWithShare["steps"][number] }) => void,
): Promise<void> {
  const script = scriptOf(source, day);
  const { container, unmount } = await renderFlow(day, source);
  try {
    for (let index = 0; index < script.steps.length; index += 1) {
      visit({ container, step: script.steps[index]! });
      if (index < script.steps.length - 1) {
        fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
      }
    }
  } finally {
    unmount();
  }
}

/** Collects the shown share moments of one day. */
async function collectMoments(day: number, source: StorytimeWeek): Promise<HTMLElement[]> {
  const found: HTMLElement[] = [];
  await walkDay(day, source, ({ container }) => {
    found.push(...momentNodes(container));
  });
  return found;
}

/** Renders one day at the screen of a named step. */
async function openDayAtStep(day: number, stepId: string, source: StorytimeWeek) {
  const script = scriptOf(source, day);
  const index = script.steps.findIndex((step) => step.id === stepId);
  expect(
    index,
    `day=${day}: the step ${stepId} must be a step of the day for the share moment`,
  ).toBeGreaterThanOrEqual(0);
  const rendered = await renderFlow(day, source);
  for (let step = 0; step < index; step += 1) {
    fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
  }
  expect(
    rendered.container.querySelector(`[data-step-id="${stepId}"]`),
    `day=${day}: the flow must show the step ${stepId} after ${index} forward clicks`,
  ).not.toBeNull();
  return rendered;
}

/** Clicks every control of a screen once, except the forward control. */
function clickEveryControl(container: HTMLElement): void {
  const clicked = new Set<string>();
  for (let pass = 0; pass < 4; pass += 1) {
    const names = Array.from(container.querySelectorAll("button"))
      .map((button) => (button.textContent ?? "").trim())
      .filter((name) => name !== "" && name !== NEXT_STEP && !clicked.has(name));
    if (names.length === 0) break;
    for (const name of names) {
      const button = Array.from(container.querySelectorAll("button")).find(
        (candidate) => (candidate.textContent ?? "").trim() === name,
      );
      if (!button) continue;
      button.click();
      clicked.add(name);
    }
  }
}

/** Walks a folder and lists its source files, skipping `node_modules` and `.next` by exact name. */
function walkSource(folder: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(folder)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) {
      files.push(...walkSource(path));
      continue;
    }
    if (path.endsWith(".ts") || path.endsWith(".tsx")) files.push(path);
  }
  return files;
}

/** Lists the upload tokens of each file in the list. */
function uploadHits(files: string[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const token of UPLOAD_TOKENS) {
      if (text.includes(token)) hits.push(`${file}: ${token}`);
    }
  }
  return hits;
}

/** The number of network calls of the current test. */
let networkCalls = 0;

/** The function that restores the network spies. */
let restoreNetwork: (() => void) | null = null;

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);

  networkCalls = 0;
  const realFetch = globalThis.fetch;
  const realSend = XMLHttpRequest.prototype.send;
  const realBeacon = navigator.sendBeacon;

  globalThis.fetch = (() => {
    networkCalls += 1;
    return Promise.resolve({ ok: true } as Response);
  }) as typeof fetch;
  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    ...args: unknown[]
  ): void {
    networkCalls += 1;
    return (realSend as unknown as (...values: unknown[]) => void).apply(this, args);
  } as typeof XMLHttpRequest.prototype.send;
  navigator.sendBeacon = (() => {
    networkCalls += 1;
    return true;
  }) as typeof navigator.sendBeacon;

  restoreNetwork = () => {
    globalThis.fetch = realFetch;
    XMLHttpRequest.prototype.send = realSend;
    navigator.sendBeacon = realBeacon;
  };
});

afterEach(() => {
  cleanup();
  restoreNetwork?.();
  restoreNetwork = null;
  vi.restoreAllMocks();
});

describe("Phase 4 share moment (task 4.6a, rule D23)", () => {
  it("parses the shipped share field with shares_parsed=5 and share_shots=6", async () => {
    const schema = await loadShareSchema();
    const scripts = weekWithShare(week).scripts;
    expect(scripts.length, `days=${scripts.length}: the shipped week must hold five days`).toBe(5);

    const shares = scripts.filter((script) => script.share !== undefined);
    console.log(label("shares_parsed", shares.length));
    expect(
      shares.length,
      `${label("shares_parsed", shares.length)}: every shipped day must hold scripts[].share`,
    ).toBe(5);

    const shots = shares.flatMap((script) => script.share!.shots);
    console.log(label("share_shots", shots.length));
    expect(
      shots.length,
      `${label("share_shots", shots.length)}: the shipped week must hold six share shots`,
    ).toBe(6);

    for (const [index, script] of scripts.entries()) {
      const result = schema.safeParse(script.share);
      expect(
        result.success,
        `scripts.${index}.share must pass shareSchema; issues=${JSON.stringify(result.error?.issues ?? [])}`,
      ).toBe(true);
    }
  });

  it("rejects each broken share object with its field path", async () => {
    await loadShareSchema();
    const baseShots = shareOf(week, 1).shots;
    expect(
      baseShots.length,
      `base_shots=${baseShots.length}: the day 1 share must hold a shot for the broken cases`,
    ).toBeGreaterThan(0);

    const cases: Array<{
      name: string;
      mutate: (share: Share) => void;
      path: string;
      key?: string;
    }> = [
      { name: "0 shots", mutate: (share) => { share.shots = []; }, path: "scripts.0.share.shots" },
      {
        name: "3 shots",
        mutate: (share) => {
          share.shots.push({ step: "A1", media: "photo" });
          share.shots.push({ step: "A2", media: "video" });
        },
        path: "scripts.0.share.shots",
      },
      {
        name: 'media "audio"',
        mutate: (share) => {
          (share.shots[0] as unknown as { media: string }).media = "audio";
        },
        path: "scripts.0.share.shots.0.media",
      },
      {
        name: "a shot with a file key",
        mutate: (share) => {
          (share.shots[0] as unknown as Record<string, unknown>).file = "l2/media/w01/a.jpg";
        },
        path: "scripts.0.share.shots.0",
        key: "file",
      },
      {
        name: "an extra key on share",
        mutate: (share) => {
          (share as unknown as Record<string, unknown>).path = "l2/media/w01/a.jpg";
        },
        path: "scripts.0.share",
        key: "path",
      },
      {
        name: "an empty caption.en",
        mutate: (share) => {
          share.caption.en = "";
        },
        path: "scripts.0.share.caption.en",
      },
    ];

    for (const item of cases) {
      const copy = structuredClone(week) as WeekWithShare;
      const share = scriptOf(copy, 1).share!;
      item.mutate(share);
      const result = weekSchema.safeParse(copy);
      expect(
        result.success,
        `the broken share (${item.name}) must fail weekSchema`,
      ).toBe(false);
      if (result.success) continue;
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      const match = issues.find((issue) => issue.path.startsWith("scripts.0.share"));
      expect(
        match,
        `the broken share (${item.name}) must fail under scripts.0.share; issues=${JSON.stringify(issues)}`,
      ).toBeDefined();
      expect(
        match!.path.startsWith(item.path),
        `the broken share (${item.name}) must fail at ${item.path}, not ${match!.path}`,
      ).toBe(true);
      if (item.key) {
        expect(
          match!.message,
          `the strict share at ${item.path} must name the key ${item.key}, not "${match!.message}"`,
        ).toContain(item.key);
      }
    }
  });

  it("keeps the moment hidden while approval.loops is draft, with an approved positive control", async () => {
    const approved = approvedClone();
    const control = await collectMoments(1, approved);
    expect(
      control.length,
      `${label("share_shown_approved", control.length)}: the approved clone must show the day 1 moment at A3`,
    ).toBe(1);
    expect(
      control[0]!.getAttribute("data-share-moment"),
      "the approved clone must show the day 1 moment at A3",
    ).toBe("A3");

    const line = await loadConsentLine();
    let screens = 0;
    let shown = 0;
    let consent = 0;
    for (const day of DAYS) {
      await walkDay(day, week, ({ container }) => {
        screens += 1;
        shown += momentNodes(container).length;
        if ((container.textContent ?? "").includes(line.en)) consent += 1;
      });
    }
    console.log(`${label("screens", screens)} ${label("share_shown_draft", shown)}`);
    expect(screens, `${label("screens", screens)}: the walk must read at least one screen`).toBeGreaterThan(0);
    expect(
      shown,
      `${label("share_shown_draft", shown)}: a draft loops part must show no share moment`,
    ).toBe(0);
    expect(
      consent,
      `consent_lines_draft=${consent}: a draft loops part must show no consent line`,
    ).toBe(0);
  });

  it("shows no moment when approval.loops or scripts[].share is absent, and does not crash", async () => {
    const approved = approvedClone();
    const control = await collectMoments(1, approved);
    expect(
      control.length,
      `${label("share_shown_approved", control.length)}: the approved clone must show the day 1 moment at A3`,
    ).toBe(1);

    const absentLoops = structuredClone(approved) as WeekWithShare;
    delete (absentLoops.approval as Record<string, unknown>).loops;
    expect(
      weekSchema.safeParse(absentLoops).success,
      "the clone with no approval.loops must pass weekSchema before it renders (A4)",
    ).toBe(true);
    let shownWithoutLoops = 0;
    for (const day of DAYS) {
      await walkDay(day, absentLoops as StorytimeWeek, ({ container }) => {
        shownWithoutLoops += momentNodes(container).length;
      });
    }
    expect(
      shownWithoutLoops,
      `${label("share_shown_absent_loops", shownWithoutLoops)}: a missing loops part must show no moment`,
    ).toBe(0);

    const absentShare = structuredClone(approved) as WeekWithShare;
    for (const script of absentShare.scripts) delete script.share;
    expect(
      weekSchema.safeParse(absentShare).success,
      "the clone with no scripts[].share must pass weekSchema before it renders (A4)",
    ).toBe(true);
    let shownWithoutShare = 0;
    for (const day of DAYS) {
      await walkDay(day, absentShare as StorytimeWeek, ({ container }) => {
        shownWithoutShare += momentNodes(container).length;
      });
    }
    expect(
      shownWithoutShare,
      `${label("share_shown_absent_share", shownWithoutShare)}: a week with no share field must show no moment`,
    ).toBe(0);
  });

  it("shows the moment at the named step of its own day and nowhere else", async () => {
    const approved = approvedClone();
    const dayOneAt: string[] = [];
    await walkDay(1, approved, ({ container, step }) => {
      const nodes = momentNodes(container);
      for (const node of nodes) {
        expect(
          node.getAttribute("data-share-moment"),
          `day=1: the moment must show at the named step, not ${node.getAttribute("data-share-moment")}`,
        ).toBe(step.id);
      }
      if (nodes.length > 0) dayOneAt.push(step.id);
    });
    console.log(`${label("share_shown_day1", dayOneAt.length)} steps=${dayOneAt.join(",")}`);
    expect(
      dayOneAt,
      `${label("share_shown_day1", dayOneAt.length)}: day 1 must show the moment at A3 only`,
    ).toEqual(["A3"]);

    const dayFourAt: string[] = [];
    const dayFourMedia: string[] = [];
    await walkDay(4, approved, ({ container, step }) => {
      const nodes = momentNodes(container);
      for (const node of nodes) {
        expect(
          node.getAttribute("data-share-moment"),
          `day=4: the moment must show at the named step, not ${node.getAttribute("data-share-moment")}`,
        ).toBe(step.id);
        dayFourMedia.push(node.getAttribute("data-share-media") ?? "");
      }
      if (nodes.length > 0) dayFourAt.push(step.id);
    });
    console.log(`${label("share_shown_day4", dayFourAt.length)} steps=${dayFourAt.join(",")}`);
    expect(
      dayFourAt,
      `${label("share_shown_day4", dayFourAt.length)}: day 4 must show the two shots at D4 and D5`,
    ).toEqual(["D4", "D5"]);
    expect(
      dayFourMedia,
      "day 4 must show the photo shot and the video shot with their media kinds",
    ).toEqual(["photo", "video"]);
  });

  it("shows no moment for a shot that names a step of another day, and logs share_unresolved=1", async () => {
    const shots = shotsOf(week);
    expect(
      shots.length,
      `${label("share_shots", shots.length)}: the shipped week must hold six share shots`,
    ).toBe(6);

    const stepsOfDay = (day: number) =>
      new Set(scriptOf(week, day).steps.map((step) => step.id));
    const resolved = shots.filter(({ day, shot }) => stepsOfDay(day).has(shot.step));
    const unresolved = shots.filter(({ day, shot }) => !stepsOfDay(day).has(shot.step));
    console.log(
      `${label("share_resolved", resolved.length)} ${label("share_unresolved", unresolved.length)}`,
    );
    expect(
      resolved.length,
      `${label("share_resolved", resolved.length)}: five shots must name a step of their own day`,
    ).toBe(5);
    expect(
      unresolved.length,
      `${label("share_unresolved", unresolved.length)}: the day 5 shot must name the step D6 of day 4`,
    ).toBe(1);
    expect(unresolved[0]!.day, "the unresolved shot must be on day 5").toBe(5);
    expect(unresolved[0]!.shot.step, "the unresolved day 5 shot must name D6").toBe("D6");
    expect(
      shareOf(week, 5).shots.length,
      "day 5 must hold a shot for the unresolved case (A4)",
    ).toBeGreaterThan(0);

    const dayFour = await collectMoments(4, approvedClone());
    expect(
      dayFour.length,
      `${label("share_shown_day4", dayFour.length)}: the approved day 4 clone must show two moments`,
    ).toBe(2);

    const dayFive = await collectMoments(5, approvedClone());
    console.log(label("share_shown_day5", dayFive.length));
    expect(
      dayFive.length,
      `${label("share_shown_day5", dayFive.length)}: the day 5 shot names D6, so day 5 must show no moment`,
    ).toBe(0);
  });

  it("shows the caption in the active language and falls back to English when th is empty", async () => {
    const approved = approvedClone();
    const caption = shareOf(approved, 1).caption;
    expect(
      caption.en.trim().length,
      "the shipped day 1 caption must hold English text",
    ).toBeGreaterThan(0);
    expect(
      caption.th.trim().length,
      "the shipped day 1 caption must hold Thai text for the language case",
    ).toBeGreaterThan(0);

    const first = await openDayAtStep(1, "A3", approved);
    let moment = first.container.querySelector<HTMLElement>('[data-share-moment="A3"]');
    expect(
      moment,
      "the approved clone must show the share moment at A3 before the language is read",
    ).not.toBeNull();
    expect(moment!.textContent, "the moment must show caption.en").toContain(caption.en);

    fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
    moment = first.container.querySelector<HTMLElement>('[data-share-moment="A3"]');
    expect(moment, "the moment must stay at A3 after the Thai toggle").not.toBeNull();
    expect(moment!.textContent, "the moment must show caption.th with the Thai toggle on").toContain(
      caption.th,
    );
    expect(
      moment!.textContent,
      "the English caption must not stay when the Thai caption exists",
    ).not.toContain(caption.en);
    first.unmount();

    const emptyThai = approvedClone();
    scriptOf(emptyThai, 1).share!.caption.th = "";
    expect(
      weekSchema.safeParse(emptyThai).success,
      "the clone with an empty caption.th must pass weekSchema before it renders (A4)",
    ).toBe(true);
    const second = await openDayAtStep(1, "A3", emptyThai);
    fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
    const fallback = second.container.querySelector<HTMLElement>('[data-share-moment="A3"]');
    expect(fallback, "the clone with an empty caption.th must show the moment at A3").not.toBeNull();
    expect(
      fallback!.textContent,
      "an empty caption.th must fall back to caption.en",
    ).toContain(caption.en);
    second.unmount();
  });

  it("shows the consent line in the active language on each moment, and on no hidden moment", async () => {
    const line = await loadConsentLine();
    expect(line.en.trim().length, "SHARE_CONSENT_LINE.en must not be empty").toBeGreaterThan(0);
    expect(line.th.trim().length, "SHARE_CONSENT_LINE.th must not be empty").toBeGreaterThan(0);
    expect(
      line.en,
      "SHARE_CONSENT_LINE.en and SHARE_CONSENT_LINE.th must differ for the language check",
    ).not.toBe(line.th);

    const shown = await openDayAtStep(1, "A3", approvedClone());
    const moment = shown.container.querySelector<HTMLElement>('[data-share-moment="A3"]');
    expect(moment, "the approved clone must show the day 1 moment at A3").not.toBeNull();
    expect(moment!.textContent, "the moment must hold the English consent line").toContain(line.en);

    fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
    const thaiMoment = shown.container.querySelector<HTMLElement>('[data-share-moment="A3"]');
    expect(
      thaiMoment!.textContent,
      "the moment must hold the Thai consent line with the Thai toggle on",
    ).toContain(line.th);
    shown.unmount();

    let hidden = 0;
    for (const day of DAYS) {
      await walkDay(day, week, ({ container }) => {
        const text = container.textContent ?? "";
        if (text.includes(line.en) || text.includes(line.th)) hidden += 1;
      });
    }
    expect(
      hidden,
      `consent_lines_draft=${hidden}: a draft loops part must show no consent line`,
    ).toBe(0);
  });

  it("shows a different label for a photo shot and a video shot", async () => {
    const approved = approvedClone();
    const photoDay = await openDayAtStep(4, "D4", approved);
    const photo = photoDay.container.querySelector<HTMLElement>('[data-share-moment="D4"]');
    expect(photo, "the approved clone must show the D4 photo moment").not.toBeNull();
    expect(
      photo!.getAttribute("data-share-media"),
      "the D4 moment must carry data-share-media=photo",
    ).toBe("photo");
    const photoLabel = photo!.querySelector("[data-share-label]")?.textContent?.trim() ?? "";
    expect(
      photoLabel.length,
      `photo_label_length=${photoLabel.length}: the photo moment must show a label`,
    ).toBeGreaterThan(0);
    photoDay.unmount();

    const videoDay = await openDayAtStep(4, "D5", approved);
    const video = videoDay.container.querySelector<HTMLElement>('[data-share-moment="D5"]');
    expect(video, "the approved clone must show the D5 video moment").not.toBeNull();
    expect(
      video!.getAttribute("data-share-media"),
      "the D5 moment must carry data-share-media=video",
    ).toBe("video");
    const videoLabel = video!.querySelector("[data-share-label]")?.textContent?.trim() ?? "";
    expect(
      videoLabel.length,
      `video_label_length=${videoLabel.length}: the video moment must show a label`,
    ).toBeGreaterThan(0);
    expect(videoLabel, "the photo label and the video label must differ").not.toBe(photoLabel);
    videoDay.unmount();
  });

  it("follows the approval only, so an approved level 1 week and an approved review week show the moment", async () => {
    const levelOne = approvedClone();
    levelOne.meta.level = 1;
    levelOne.meta.key = "st1/1";
    expect(
      weekSchema.safeParse(levelOne).success,
      "the approved level 1 clone must pass weekSchema before it renders (A4)",
    ).toBe(true);
    const levelOneMoments = await collectMoments(1, levelOne as StorytimeWeek);
    console.log(label("share_shown_level1", levelOneMoments.length));
    expect(
      levelOneMoments.length,
      `${label("share_shown_level1", levelOneMoments.length)}: the moment follows the approval only, not the loops level rule (Q9)`,
    ).toBe(1);

    const review = structuredClone(reviewWeek) as WeekWithShare;
    review.approval = {
      ...(review.approval ?? {}),
      loops: { status: "approved", date: "2026-11-10", words: "test clone" },
    };
    expect(
      weekSchema.safeParse(review).success,
      "the approved review clone must pass weekSchema before it renders (A4)",
    ).toBe(true);
    const reviewMoments = await collectMoments(1, review as StorytimeWeek);
    console.log(label("share_shown_review", reviewMoments.length));
    expect(
      reviewMoments.length,
      `${label("share_shown_review", reviewMoments.length)}: the moment follows the approval only, so a review week shows it (Q9)`,
    ).toBe(1);
    expect(
      reviewMoments[0]!.getAttribute("data-share-moment"),
      "the review week day 1 moment must show at A2",
    ).toBe("A2");
  });

  it("sends no upload during a walk of all five approved days, with a positive control", async () => {
    const approved = approvedClone();

    await globalThis.fetch("https://example.invalid/share-probe");
    expect(
      networkCalls,
      `${label("network_calls", networkCalls)}: the positive control must count its own fetch`,
    ).toBe(1);
    networkCalls = 0;

    let shownTotal = 0;
    let fileInputs = 0;
    let captures = 0;
    let forms = 0;
    for (const day of DAYS) {
      await walkDay(day, approved, ({ container }) => {
        const countDom = () => {
          fileInputs += container.querySelectorAll('input[type="file"]').length;
          captures += container.querySelectorAll("[capture]").length;
          forms += container.querySelectorAll("form").length;
        };
        countDom();
        shownTotal += momentNodes(container).length;
        clickEveryControl(container);
        countDom();
        shownTotal += momentNodes(container).length;
      });
    }

    console.log(
      `${label("share_shown_total", shownTotal)} ${label("network_calls", networkCalls)}`,
    );
    expect(
      shownTotal,
      `${label("share_shown_total", shownTotal)}: the walk must see a moment before it claims no upload`,
    ).toBeGreaterThan(0);
    expect(
      networkCalls,
      `${label("network_calls", networkCalls)}: the share walk must send no fetch, XHR, or beacon`,
    ).toBe(0);
    expect(fileInputs, `${label("file_inputs", fileInputs)}: the app must hold no file input`).toBe(0);
    expect(
      captures,
      `${label("capture_attributes", captures)}: the app must hold no capture attribute`,
    ).toBe(0);
    expect(forms, `${label("forms", forms)}: the app must hold no upload form`).toBe(0);
  });

  it("keeps every teacher source free of an upload path, with a planted positive control", () => {
    const cwd = process.cwd();
    const appRoot = existsSync(join(cwd, "app")) ? cwd : join(cwd, "apps/storytime");
    const shareModule = join(appRoot, "lib/share-moment.ts");
    expect(
      existsSync(shareModule),
      "Storytime must add lib/share-moment.ts for the share rule and the consent line",
    ).toBe(true);

    const teacherSources = walkSource(join(appRoot, "app/[locale]/teacher"));
    const files = [...teacherSources, shareModule, join(appRoot, "lib/contracts/week.ts")];
    const filesScanned = files.length;
    console.log(label("files_scanned", filesScanned));
    expect(
      filesScanned,
      `${label("files_scanned", filesScanned)}: the scan must read at least 4 teacher files`,
    ).toBeGreaterThanOrEqual(4);

    const hits = uploadHits(files);
    expect(
      hits.length,
      `${label("upload_hits", hits.length)}: the teacher source must hold no upload path; ${hits.join(", ")}`,
    ).toBe(0);

    const folder = mkdtempSync(join(tmpdir(), "share-scan-"));
    try {
      const planted = join(folder, "planted.ts");
      writeFileSync(planted, "const body = new FormData();\n", "utf8");
      const control = uploadHits([planted]);
      expect(
        control.length,
        `${label("control_hits", control.length)}: the scan must find a planted FormData line`,
      ).toBe(1);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("characterization: the shipped share field adds no loop field and the task 4.6 counts stay", () => {
    const shares = weekWithShare(week).scripts.filter((script) => script.share !== undefined);
    console.log(label("share_days", shares.length));
    expect(
      shares.length,
      `${label("share_days", shares.length)}: the shipped week must hold share on all five days`,
    ).toBe(5);

    let soundLoopSteps = 0;
    let blendDrillSteps = 0;
    let sightWordSteps = 0;
    let loopMinuteSteps = 0;
    let loopMinuteDiffers = 0;
    let recallDays = 0;
    for (const script of weekWithShare(week).scripts) {
      if (script.recall) recallDays += 1;
      for (const step of script.steps) {
        if (step.soundLoop) soundLoopSteps += 1;
        if (step.blendDrill) blendDrillSteps += 1;
        if (step.sightWords) sightWordSteps += 1;
        if (step.loopMinutes !== undefined) {
          loopMinuteSteps += 1;
          if (step.loopMinutes !== step.minutes) loopMinuteDiffers += 1;
        }
      }
    }
    const counts: Array<[string, number, number]> = [
      ["soundloop_steps", soundLoopSteps, 3],
      ["blenddrill_steps", blendDrillSteps, 1],
      ["sightwords_steps", sightWordSteps, 2],
      ["loopminutes_steps", loopMinuteSteps, 7],
      ["loopminutes_differs", loopMinuteDiffers, 4],
      ["recall_days", recallDays, 4],
    ];
    for (const [name, value, expected] of counts) {
      expect(
        value,
        `${label(name, value)}: the share field must not change the task 4.6 count ${expected}`,
      ).toBe(expected);
    }
  });
});
