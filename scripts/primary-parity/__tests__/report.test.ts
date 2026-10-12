import { describe, expect, it } from "vitest";
import * as report from "../report.js";

interface Shot {
  png: string;
  text: string;
}
interface AppCapture {
  status: number;
  finalUrl: string;
  consoleErrors: number;
  shots: Record<string, Shot>;
}
interface ReportInput {
  list: unknown;
  captures: Record<string, { legacy?: AppCapture; new?: AppCapture }>;
  [extra: string]: unknown;
}

/**
 * API that Phase 3 adds to report.ts:
 * diffLines(legacyText, newText) and renderReport({list, captures}) returning {markdown, html}.
 * Shot keys are `<width>-<scheme>`; `png` is a path relative to the member folder.
 */
const api = report as unknown as {
  diffLines: (legacy: string, next: string) => { onlyLegacy: string[]; onlyNew: string[] };
  renderReport: (input: ReportInput) => { markdown: string; html: string };
};

const list = {
  member: "m1",
  pairs: [
    {
      id: "SYS-01",
      rows: ["SYS-01", "SYS-02"],
      role: "SYSTEM",
      legacyPath: "/en/system/dashboard",
      newPath: "/en/system/dashboard",
      widths: [375, 1280],
      colorSchemes: ["light"],
      checks: [
        { id: "C1", behavior: "The page shows the metric cards." },
        { id: "C2", behavior: "The heading is visible." },
      ],
    },
  ],
};

const capture = (app: string, text: string, widths = [375, 1280]): AppCapture => ({
  status: 200,
  finalUrl: `http://localhost:3100/en/system/dashboard`,
  consoleErrors: 0,
  shots: Object.fromEntries(widths.map((w) => [`${w}-light`, { png: `SYS-01/${app}-${w}-light.png`, text }])),
});

const full = (): ReportInput => ({
  list,
  captures: { "SYS-01": { legacy: capture("legacy", "Students\n12\nTeachers"), new: capture("new", "System Dashboard\nTeachers") } },
});

describe("diffLines", () => {
  it("finds the lines only in legacy and only in new", () => {
    const d = api.diffLines("Students\n12\nTeachers", "System Dashboard\nTeachers");
    expect(d.onlyLegacy).toEqual(["Students", "12"]);
    expect(d.onlyNew).toEqual(["System Dashboard"]);
  });

  it("normalizes spaces and ignores empty lines", () => {
    const d = api.diffLines("  Total   students \n\n", "Total students");
    expect(d.onlyLegacy).toEqual([]);
    expect(d.onlyNew).toEqual([]);
  });

  it("returns empty lists for equal texts", () => {
    expect(api.diffLines("a\nb", "b\na")).toEqual({ onlyLegacy: [], onlyNew: [] });
  });
});

describe("renderReport", () => {
  it("writes a markdown checklist table with empty Result and Note cells", () => {
    const { markdown } = api.renderReport(full());
    expect(markdown).toMatch(/\|\s*Check\s*\|\s*Behavior\s*\|\s*Result\s*\|\s*Note\s*\|/);
    expect(markdown).toMatch(/\|\s*C1\s*\|\s*The page shows the metric cards\.\s*\|\s*\|\s*\|/);
    expect(markdown).toMatch(/\|\s*C2\s*\|\s*The heading is visible\.\s*\|\s*\|\s*\|/);
  });

  it("shows the rows, the role, and both paths", () => {
    const { markdown } = api.renderReport(full());
    expect(markdown).toContain("SYS-01");
    expect(markdown).toContain("SYS-02");
    expect(markdown).toContain("SYSTEM");
    expect(markdown).toContain("/en/system/dashboard");
  });

  it("lists the text lines only in legacy and only in new", () => {
    const { markdown } = api.renderReport(full());
    expect(markdown).toContain("Students");
    expect(markdown).toContain("System Dashboard");
  });

  it("uses relative image paths in the HTML and loads nothing from the network", () => {
    const { html } = api.renderReport(full());
    expect(html).toContain('src="SYS-01/legacy-375-light.png"');
    expect(html).toContain('src="SYS-01/new-1280-light.png"');
    expect(html).not.toMatch(/src="(?:https?:)?\/\//);
    expect(html).not.toMatch(/src="\//);
    expect(html).not.toMatch(/<link[^>]+href="https?:/);
    expect(html).not.toMatch(/<script[^>]+src=/);
  });

  it('shows "not captured" for a missing app capture', () => {
    const input = full();
    delete input.captures["SYS-01"].new;
    const { markdown, html } = api.renderReport(input);
    expect(markdown).toContain("not captured");
    expect(html).toContain("not captured");
  });

  it('shows "not captured" for a pair with no capture at all', () => {
    const { markdown } = api.renderReport({ list, captures: {} });
    expect(markdown).toContain("not captured");
    expect(markdown).toContain("C1");
  });

  it('shows "not captured" for a missing width', () => {
    const input = full();
    input.captures["SYS-01"].new = capture("new", "System Dashboard", [375]);
    const { html } = api.renderReport(input);
    expect(html).toContain("not captured");
    expect(html).toContain('src="SYS-01/new-375-light.png"');
  });

  it("shows the status and the final URL", () => {
    const input = full();
    input.captures["SYS-01"].new!.status = 404;
    input.captures["SYS-01"].new!.finalUrl = "http://localhost:3005/en/signin";
    const { markdown } = api.renderReport(input);
    expect(markdown).toContain("404");
    expect(markdown).toContain("http://localhost:3005/en/signin");
  });

  it("escapes captured text in the HTML", () => {
    const input = full();
    input.captures["SYS-01"].legacy = capture("legacy", "<script>alert(1)</script>");
    const { html } = api.renderReport(input);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("does not copy a field of the accounts file into the output", () => {
    const input = { ...full(), accounts: { SYSTEM: { userId: "u-secret-1", legacy: { kind: "password", email: "a@b.c", password: "pw-secret-9" } } } };
    const { markdown, html } = api.renderReport(input);
    for (const secret of ["u-secret-1", "pw-secret-9", "a@b.c"]) {
      expect(markdown).not.toContain(secret);
      expect(html).not.toContain(secret);
    }
  });

  it("uses a longer markdown fence when the text holds a fence", () => {
    const input = full();
    input.captures["SYS-01"].legacy = capture("legacy", "a\n```\nb");
    const { markdown } = api.renderReport(input);
    expect(markdown).toContain("````\na\n```\nb\n````");
  });

  it("treats a missing text file as not captured", () => {
    const input = full();
    const shots = input.captures["SYS-01"].legacy!.shots;
    for (const k of Object.keys(shots)) shots[k] = { png: shots[k].png, text: undefined } as never;
    const { markdown } = api.renderReport(input);
    expect(markdown).not.toContain("Only in legacy");
    expect(markdown).toContain("not captured");
  });
});

describe("network note", () => {
  const withNet = (net: string[]) => ({
    list: { member: "m1", pairs: [{ ...list.pairs[0], checks: [{ id: "C1", behavior: "No old asset.", network: "standard-pack" }] }] },
    captures: { "SYS-01": { legacy: { ...capture("legacy", "a"), network: { C1: ["/assets/standard-pack/x.png"] } }, new: { ...capture("new", "a"), network: { C1: net } } } },
  });
  it("lists the matching paths of both apps in the Note cell", () => {
    const { markdown } = api.renderReport(withNet([]));
    expect(markdown).toContain("legacy: 1 request(s): /assets/standard-pack/x.png");
    expect(markdown).toContain("new: no matching request");
  });
});
