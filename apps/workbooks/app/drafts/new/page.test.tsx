import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NewDraftPage from "./page";

/**
 * The new-draft route must fail closed: it explains where drafts come from and
 * carries no ingestion surface (no form, no textarea, no file/URL input), and
 * the paste-source server action is deleted outright so the vector cannot
 * resurface through a dead export.
 */
describe("new draft page / pasted-remote ingestion rejected", () => {
  it("renders guidance pointing at the legacy import CLI and the source catalog", async () => {
    const html = renderToStaticMarkup(await NewDraftPage());
    expect(html).toContain("legacy import CLI");
    expect(html).toContain("source catalog");
  });

  it("renders no form, textarea, or file/URL input", async () => {
    const html = renderToStaticMarkup(await NewDraftPage());
    const lower = html.toLowerCase();
    expect(lower).not.toContain("<form");
    expect(lower).not.toContain("<textarea");
    expect(lower).not.toContain("input type=");
    expect(lower).not.toContain("<input");
  });

  it("no longer ships the paste-source server action", () => {
    const actionsPath = fileURLToPath(
      new URL("./actions.ts", import.meta.url),
    );
    expect(existsSync(actionsPath)).toBe(false);
  });
});
