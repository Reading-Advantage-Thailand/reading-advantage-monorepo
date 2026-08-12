import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scriptSchema, thaiNarrationScriptSchema } from "@/lib/script-schema";
import {
  analyzeI18nGraph,
  buildFixtureGraph,
  buildMarketingGraph,
} from "./helpers/phase-7-i18n-contract";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = [
  "settings/page.tsx",
  "campaigns/page.tsx",
  "campaigns/[id]/page.tsx",
  "campaigns/[id]/video/page.tsx",
] as const;
const analyze = (graph: ReturnType<typeof buildMarketingGraph>) =>
  analyzeI18nGraph(graph, PAGES, "layout.tsx");

describe("Phase 7.4: Marketing language contract", () => {
  it("matches html lang to the explicit locale or current visible-language witness", () => {
    const analysis = analyze(
      buildMarketingGraph(ROOT, [...PAGES, "layout.tsx"]),
    );
    const expected = analysis.defaultLocale ?? analysis.inferredLocale;
    expect(expected).toMatch(/^(en|th)$/);
    expect(analysis.layoutLocale).toBe(expected);
  });
  it("requires real message data and used accessor output for every client page", () => {
    const analysis = analyze(
      buildMarketingGraph(ROOT, [...PAGES, "layout.tsx"]),
    );
    expect(analysis.messagePaths.size).toBeGreaterThan(0);
    expect(analysis.messageTexts.length).toBeGreaterThan(0);
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it("removes visible copy from the full transitive client graph", () => {
    const inlineLiterals = analyze(
      buildMarketingGraph(ROOT, [...PAGES, "layout.tsx"]),
    ).inlineLiterals;
    expect(inlineLiterals).not.toContain(
      "campaigns/[id]/video/page.tsx: existing-projects-heading",
    );
    expect(inlineLiterals).toEqual([]);
  });
});

describe("Phase 7.4: analyzer counterexamples", () => {
  it("finds object-property and zero-argument function copy in imported clients", () => {
    const property = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import Copy from "./copy"; export default function Page(){return <Copy/>}`,
          "copy.tsx": `export default function Copy(){const copy={title:"Inline property copy"}; return <p>{copy.title}</p>}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    const returned = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import Copy from "./copy"; export default function Page(){return <Copy/>}`,
          "copy.tsx": `function copy(){return "Inline function copy"} export default function Copy(){return <p>{copy()}</p>}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(property.inlineLiterals.join("\n")).toContain(
      "Inline property copy",
    );
    expect(returned.inlineLiterals.join("\n")).toContain(
      "Inline function copy",
    );
  });
  it("accepts a real dictionary/accessor result and rejects an unused import", () => {
    const compliant = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Dictionary copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    const unused = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>Inline copy</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Dictionary copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(compliant.realI18nConsumption).toBe(true);
    expect(compliant.inlineLiterals).toEqual([]);
    expect(unused.realI18nConsumption).toBe(false);
    expect(unused.inlineLiterals.join("\n")).toContain("Inline copy");
  });
  it("supports a default-exported accessor without prescribing its name", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import getText from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const dictionary={title:"Default accessor copy"}; function readTitle(){return dictionary.title} export default readTitle`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.realI18nConsumption).toBe(true);
    expect(analysis.inlineLiterals).toEqual([]);
  });
  it("supports an accessor called through a namespace import", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import * as i18n from "./i18n"; export default function Page(){return <p>{i18n.getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const labels={title:"Namespace accessor copy"}; export function getText(){return labels.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.realI18nConsumption).toBe(true);
    expect(analysis.inlineLiterals).toEqual([]);
  });
  it("supports a destructured hook accessor", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {useI18n} from "./i18n"; export default function Page(){const {t}=useI18n(); return <p>{t("title")}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Hook accessor copy"}; export function useI18n(){return {t: (key: string) => messages[key]}}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.realI18nConsumption).toBe(true);
    expect(analysis.inlineLiterals).toEqual([]);
  });
  it("still scans inline JSX in a module that owns the dictionary", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.tsx": `export const defaultLocale="en"; const messages={title:"Dictionary copy"}; export function getText(){return messages.title} export function Preview(){return <p>Colocated inline copy</p>}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toContain(
      "Colocated inline copy",
    );
  });
  it("resolves imported plain constants instead of treating them as messages", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText, TITLE} from "./copy"; export default function Page(){return <><p>{getText()}</p><p>{TITLE}</p></>}`,
          "copy.ts": `export const defaultLocale="en"; export const TITLE="Imported plain copy"; const messages={title:"Dictionary copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toContain("Imported plain copy");
  });
  it("catches a forbidden server package through the contract graph", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; import {secret} from "./messages"; export function getText(){return secret.title}`,
          "messages.ts": `import "@reading-advantage/domain"; export const secret={title:"Dictionary copy"}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafePaths).toContain("messages.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("checks safety across the page-to-accessor graph", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `"use server"; import "server-only"; import {messages} from "./messages"; export function getText(){return messages.title}`,
          "messages.ts": `export const defaultLocale="en"; export const messages={title:"Server graph copy"}`,
          "unrelated.ts": `"use server"; import "server-only"; export const ignored="Not reachable"`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.unsafePaths).not.toContain("unrelated.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("finds visible custom-component props without flagging technical props", () => {
    const visible = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import View from "./view"; export default function Page(){return <View label="Save changes" path="/settings" id="save-button" data-testid="save" />}`,
          "view.tsx": `export default function View(){return <div />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    const technical = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import View from "./view"; export default function Page(){return <View path="/settings" id="save-button" data-testid="save" />}`,
          "view.tsx": `export default function View(){return <div />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(visible.inlineLiterals.join("\n")).toContain("Save changes");
    expect(technical.inlineLiterals).toEqual([]);
  });
  it("only treats user-facing ARIA text as visible copy", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `export default function Page(){return <><button aria-label="Close dialog" aria-description="Closes this dialog" aria-valuetext="50 percent" aria-roledescription="Dialog" aria-labelledby="existing-heading" aria-describedby="dialog-description" aria-details="dialog-details" aria-controls="dialog-panel" aria-owns="dialog-owned" aria-activedescendant="dialog-option" aria-expanded="true" aria-selected="false" aria-hidden="false" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" aria-keyshortcuts="Enter" /></>}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals).toEqual(
      expect.arrayContaining([
        "page.tsx: Close dialog",
        "page.tsx: Closes this dialog",
        "page.tsx: 50 percent",
        "page.tsx: Dialog",
      ]),
    );
    expect(analysis.inlineLiterals).not.toEqual(
      expect.arrayContaining([
        "page.tsx: existing-heading",
        "page.tsx: dialog-description",
        "page.tsx: dialog-details",
        "page.tsx: dialog-panel",
        "page.tsx: dialog-owned",
        "page.tsx: dialog-option",
        "page.tsx: Enter",
      ]),
    );
  });
  it("resolves a layout locale imported from the message module", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "layout.tsx": `import {defaultLocale} from "./messages"; export default function Layout({children}){return <html lang={defaultLocale}><body>{children}</body></html>}`,
          "i18n.ts": `import {messages} from "./messages"; export function getText(){return messages.title}`,
          "messages.ts": `export const defaultLocale="th"; export const messages={title:"ข้อความภาษาไทย"}`,
        },
        ["page.tsx", "layout.tsx"],
      ),
      ["page.tsx"],
      "layout.tsx",
    );
    expect(analysis.defaultLocale).toBe("th");
    expect(analysis.layoutLocale).toBe("th");
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it("follows nested locale-keyed dictionary access to accessor output", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText("title")}</p>}`,
          "i18n.ts": `import {defaultLocale,messages} from "./messages"; export function getText(key: string){return messages[defaultLocale][key]}`,
          "messages.ts": `export const defaultLocale="en"; export const messages={en:{title:"Nested dictionary copy"}}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.realI18nConsumption).toBe(true);
    expect(analysis.inlineLiterals).toEqual([]);
  });
  it("ignores dictionary references in unused nested functions", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Unused nested copy"}; export function getText(){function unused(){return messages.title} return window.name}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.messagePaths).toEqual(new Set());
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("ignores type-only witnesses and follows rendered array.map values", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import type {Witness} from "./witness"; export default function Page(){const labels=["Inline page copy"]; return <>{labels.map((label)=><p>{label}</p>)}</>}`,
          "witness.ts": `export const defaultLocale="en"; const messages={title:"Translated Witness"}; export function getText(){return messages.title} export type Witness = ReturnType<typeof getText>`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.defaultLocale).toBe("en");
    expect(analysis.messageTexts).toContain("Translated Witness");
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.pageConsumption).toBe(false);
    expect(analysis.realI18nConsumption).toBe(false);
    expect(analysis.inlineLiterals.join("\n")).toContain("Inline page copy");
  });
  it("does not flag technical arrays or maps that never render", () => {
    const technical = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `const ids=["save-button"]; export default function Page(){return <>{ids.map((id)=><input id={id} value="state" />)}</>}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    const notRendered = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `const labels=["Not rendered copy"]; export default function Page(){labels.map((label)=>label.trim()); return <div />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(technical.inlineLiterals).toEqual([]);
    expect(notRendered.inlineLiterals).toEqual([]);
  });
  it("treats custom value copy as visible but keeps intrinsic input value technical", () => {
    const custom = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import StatusBadge from "./status-badge"; export default function Page(){return <StatusBadge value="Launch ready" />}`,
          "status-badge.tsx": `export default function StatusBadge({value}){return <span>{value}</span>}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    const intrinsic = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `export default function Page(){return <input value="input-state" />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(custom.inlineLiterals.join("\n")).toContain("Launch ready");
    expect(intrinsic.inlineLiterals).toEqual([]);
  });
  it("catches bare Node builtin imports in the runtime contract graph", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `import {readFileSync} from "fs"; export const defaultLocale="en"; const messages={title:"Builtin graph copy"}; export function getText(){readFileSync; return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("resolves a namespace imported locale property", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "layout.tsx": `import * as messages from "./messages"; export default function Layout({children}){return <html lang={messages.defaultLocale}><body>{children}</body></html>}`,
          "i18n.ts": `import {messages} from "./messages"; export function getText(){return messages.title}`,
          "messages.ts": `export const defaultLocale="th"; export const messages={title:"ข้อความภาษาไทย"}`,
        },
        ["page.tsx", "layout.tsx"],
      ),
      ["page.tsx"],
      "layout.tsx",
    );
    expect(analysis.layoutLocale).toBe("th");
  });
});

describe("Phase 7.4: Thai narration characterization", () => {
  it("preserves structural and Thai-language narration validation", () => {
    const thaiScenes = Array.from({ length: 5 }, (_, index) => ({
      narration: `ฉากที่ ${index + 1} ช่วยให้นักเรียนรักการอ่าน`,
      imagePrompt: "A bright Thai classroom",
      motionDirection: "Static",
    }));
    expect(scriptSchema.safeParse(thaiScenes).success).toBe(true);
    expect(thaiNarrationScriptSchema.safeParse(thaiScenes).success).toBe(true);
    const nonThaiScenes = thaiScenes.map((scene, index) =>
      index === 0 ? { ...scene, narration: "English narration only" } : scene,
    );
    expect(scriptSchema.safeParse(nonThaiScenes).success).toBe(true);
    expect(thaiNarrationScriptSchema.safeParse(nonThaiScenes).success).toBe(
      false,
    );
  });
});
