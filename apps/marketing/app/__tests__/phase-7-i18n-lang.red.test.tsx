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
  "page.tsx",
  "login/page.tsx",
  "settings/page.tsx",
  "campaigns/page.tsx",
  "campaigns/[id]/page.tsx",
  "campaigns/[id]/video/page.tsx",
] as const;
const analyze = (graph: ReturnType<typeof buildMarketingGraph>) =>
  analyzeI18nGraph(graph, PAGES, "layout.tsx");

/**
 * Clones the mutable analysis containers so production assertions cannot
 * mutate the cached result or leak state into another assertion.
 * @param analysis The analysis snapshot to clone.
 * @returns An isolated analysis view with fresh collection containers.
 */
const cloneAnalysis = (
  analysis: ReturnType<typeof analyze>,
): ReturnType<typeof analyze> => ({
  ...analysis,
  graph: new Map(analysis.graph),
  messagePaths: new Set(analysis.messagePaths),
  messageTexts: [...analysis.messageTexts],
  unsafePaths: [...analysis.unsafePaths],
  inlineLiterals: [...analysis.inlineLiterals],
  unsafeSinks: [...analysis.unsafeSinks],
});

let productionAnalysisSnapshot: ReturnType<typeof analyze> | undefined;
let productionAnalysisBuilds = 0;

/**
 * Lazily builds one production graph analysis for the three contract tests.
 * @returns An isolated view of the shared production analysis.
 */
const getProductionAnalysis = (): ReturnType<typeof analyze> => {
  if (!productionAnalysisSnapshot) {
    productionAnalysisBuilds += 1;
    productionAnalysisSnapshot = Object.freeze(
      cloneAnalysis(
        analyze(buildMarketingGraph(ROOT, [...PAGES, "layout.tsx"])),
      ),
    ) as ReturnType<typeof analyze>;
  }

  return cloneAnalysis(productionAnalysisSnapshot);
};

const analyzeEnvironmentFixture = (read: string) =>
  analyzeI18nGraph(
    buildFixtureGraph(
      {
        "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
        "i18n.ts": `export const defaultLocale="en"; const messages={title:"Environment alias copy"}; ${read} export function getText(){return messages.title}`,
      },
      ["page.tsx"],
    ),
    ["page.tsx"],
  );

describe("Phase 7.4: Marketing language contract", () => {
  it("matches html lang to the explicit locale or current visible-language witness", () => {
    const analysis = getProductionAnalysis();
    const expected = analysis.defaultLocale ?? analysis.inferredLocale;
    expect(expected).toMatch(/^(en|th)$/);
    expect(analysis.layoutLocale).toBe(expected);
  });
  it("requires real message data and used accessor output for every client page", () => {
    const analysis = getProductionAnalysis();
    expect(analysis.messagePaths.size).toBeGreaterThan(0);
    expect(analysis.messageTexts.length).toBeGreaterThan(0);
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it("removes visible copy from the full transitive client graph", () => {
    const analysis = getProductionAnalysis();
    expect(productionAnalysisBuilds).toBe(1);
    const inlineLiterals = analysis.inlineLiterals;
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
  it("rejects hardcoded home and login copy when both routes are entries", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "login/page.tsx": `export default function Login(){return <h1>Hardcoded login copy</h1>}`,
          "i18n.ts": `const messages={title:"Translated home copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx", "login/page.tsx"],
      ),
      ["page.tsx", "login/page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toContain(
      "Hardcoded login copy",
    );
    expect(analysis.pageConsumption).toBe(false);
    expect(analysis.realI18nConsumption).toBe(false);
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
          "page.tsx": `import {getText} from "./i18n"; import {Preview} from "./i18n"; export default function Page(){return <><p>{getText()}</p><Preview/></>}`,
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
  it("does not count unused module-level JSX or aliases", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; const preview=<p>{getText()}</p>; const labels=["Unused array copy"]; const card={body:<p>Unused object copy</p>}; export default function Page(){return <div/>}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Unused module copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.pageConsumption).toBe(false);
    expect(analysis.realI18nConsumption).toBe(false);
    expect(analysis.inlineLiterals).toEqual([]);
  });
  it("counts a returned module-level JSX alias", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; const preview=<p>{getText()}</p>; export default function Page(){return preview}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Returned module copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.pageConsumption).toBe(true);
    expect(analysis.realI18nConsumption).toBe(true);
    expect(analysis.inlineLiterals).toEqual([]);
  });
  it.each([
    [
      "module preview used only for ignored/logging evaluation",
      `import {getText} from "./i18n"; const preview=<p>{getText()}</p>; export default function Page(){void preview; console.log(preview); return <div/>}`,
    ],
    [
      "local preview not returned",
      `import {getText} from "./i18n"; export default function Page(){const preview=<p>{getText()}</p>; return <div/>}`,
    ],
    [
      "discarded createElement",
      `import {getText} from "./i18n"; export default function Page(){React.createElement("p",null,getText()); return <div/>}`,
    ],
    [
      "discarded map expression",
      `import {getText} from "./i18n"; export default function Page(){[1].map(()=><p>{getText()}</p>); return <div/>}`,
    ],
    [
      "unused mapped local",
      `import {getText} from "./i18n"; export default function Page(){const cards=[1].map(()=><p>{getText()}</p>); return <div/>}`,
    ],
  ])("does not count evaluation without render flow: %s", (_name, page) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": page,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Evaluation-only copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.pageConsumption).toBe(false);
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it.each([
    [
      "discard wrapper",
      `import {getText} from "./i18n"; function discard(value){return null} export default function Page(){return discard(<p>{getText()}</p>)}`,
    ],
    [
      "Boolean coercion",
      `import {getText} from "./i18n"; export default function Page(){return Boolean(<p>{getText()}</p>)}`,
    ],
    [
      "nested identity then discard",
      `import {getText} from "./i18n"; function identity(value){return value} function discard(value){return null} export default function Page(){return identity(discard(<p>{getText()}</p>))}`,
    ],
    [
      "array inside Boolean coercion",
      `import {getText} from "./i18n"; export default function Page(){return Boolean([<p>{getText()}</p>])}`,
    ],
    [
      "array inside discard wrapper",
      `import {getText} from "./i18n"; function discard(value){return null} export default function Page(){return discard([<p>{getText()}</p>])}`,
    ],
    [
      "String coercion of JSX",
      `import {getText} from "./i18n"; export default function Page(){return String(<p>{getText()}</p>)}`,
    ],
  ])(
    "does not treat discarded returned call arguments as rendered: %s",
    (_name, page) => {
      const analysis = analyzeI18nGraph(
        buildFixtureGraph(
          {
            "page.tsx": page,
            "i18n.ts": `export const defaultLocale="en"; const messages={title:"Discarded call copy"}; export function getText(){return messages.title}`,
          },
          ["page.tsx"],
        ),
        ["page.tsx"],
      );
      expect(analysis.pageConsumption).toBe(false);
      expect(analysis.realI18nConsumption).toBe(false);
    },
  );
  it.each([
    [
      "returned local preview",
      {
        "page.tsx": `import {getText} from "./i18n"; export default function Page(){const preview=<p>{getText()}</p>; return preview}`,
      },
    ],
    [
      "returned map callback",
      {
        "page.tsx": `import {getText} from "./i18n"; export default function Page(){const labels=["one"]; return labels.map(()=><p>{getText()}</p>)}`,
      },
    ],
    [
      "returned createElement",
      {
        "page.tsx": `import {getText} from "./i18n"; export default function Page(){return React.createElement("p",null,getText())}`,
      },
    ],
    [
      "returned identity wrapper",
      {
        "page.tsx": `import {getText} from "./i18n"; function identity(value){return value} export default function Page(){return identity(<p>{getText()}</p>)}`,
      },
    ],
    [
      "rendered child component",
      {
        "page.tsx": `import Card from "./card"; export default function Page(){return <Card/>}`,
        "card.tsx": `import {getText} from "./i18n"; export default function Card(){return <p>{getText()}</p>}`,
      },
    ],
  ])("counts values that flow into the render root: %s", (_name, files) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          ...files,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Returned render copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.pageConsumption).toBe(true);
    expect(analysis.realI18nConsumption).toBe(true);
    expect(analysis.inlineLiterals).toEqual([]);
  });
  it.each([
    [
      "nested identity wrapper",
      `import {getText} from "./i18n"; function a(value){return value} function b(value){return a(value)} export default function Page(){return b(<p>{getText()}</p>)}`,
    ],
    [
      "nested arrow identity wrapper",
      `import {getText} from "./i18n"; const a=(value)=>value; const b=(value)=>a(value); export default function Page(){return b(<p>{getText()}</p>)}`,
    ],
    [
      "logical render root",
      `import {getText} from "./i18n"; export default function Page(){return true && <p>{getText()}</p>}`,
    ],
    [
      "array render root",
      `import {getText} from "./i18n"; export default function Page(){return [<p>{getText()}</p>]}`,
    ],
    [
      "array spread render root",
      `import {getText} from "./i18n"; const cards=[<p>{getText()}</p>]; export default function Page(){return [...cards]}`,
    ],
    [
      "nullish logical render root",
      `import {getText} from "./i18n"; export default function Page(){return null ?? <p>{getText()}</p>}`,
    ],
    [
      "false-or message root",
      `import {getText} from "./i18n"; export default function Page(){return false || getText()}`,
    ],
    [
      "message-or fallback ReactNode",
      `import {getText} from "./i18n"; export default function Page(){return getText() || <p/>}`,
    ],
  ])("counts nested wrappers and composite render roots: %s", (_name, page) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": page,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Composite render copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.pageConsumption).toBe(true);
    expect(analysis.realI18nConsumption).toBe(true);
    expect(analysis.inlineLiterals).toEqual([]);
  });
  it.each([
    [
      "logical hardcoded copy",
      `export default function Page(){return true && <p>Logical hardcoded copy</p>}`,
      "Logical hardcoded copy",
    ],
    [
      "array hardcoded copy",
      `export default function Page(){return [<p>Array hardcoded copy</p>]}`,
      "Array hardcoded copy",
    ],
  ])("scans copy in composite render roots: %s", (_name, page, copy) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph({ "page.tsx": page }, ["page.tsx"]),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toContain(copy);
  });
  it.each([
    [
      "message used as and-condition",
      `import {getText} from "./i18n"; export default function Page(){return getText() && <div/>}`,
      null,
    ],
    [
      "message condition with hardcoded branch",
      `import {getText} from "./i18n"; export default function Page(){return getText() && <div>Hardcoded branch copy</div>}`,
      "Hardcoded branch copy",
    ],
    [
      "message used as ternary condition",
      `import {getText} from "./i18n"; export default function Page(){return getText() ? <div/> : <div/>}`,
      null,
    ],
  ])(
    "does not count control-only logical provenance: %s",
    (_name, page, copy) => {
      const analysis = analyzeI18nGraph(
        buildFixtureGraph(
          {
            "page.tsx": page,
            "i18n.ts": `export const defaultLocale="en"; const messages={title:"Control-only message"}; export function getText(){return messages.title}`,
          },
          ["page.tsx"],
        ),
        ["page.tsx"],
      );
      expect(analysis.pageConsumption).toBe(false);
      expect(analysis.realI18nConsumption).toBe(false);
      if (copy) expect(analysis.inlineLiterals.join("\n")).toContain(copy);
    },
  );
  it.each([
    [
      "template text",
      `import {getText} from "./i18n"; export default function Page(){return <p>{\`${"${getText()}"}\`}</p>}`,
    ],
    [
      "uppercase text transform",
      `import {getText} from "./i18n"; export default function Page(){return <p>{getText().toUpperCase()}</p>}`,
    ],
    [
      "String text coercion",
      `import {getText} from "./i18n"; export default function Page(){return <p>{String(getText())}</p>}`,
    ],
  ])("counts message text through a pure transform: %s", (_name, page) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": page,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Transformed message copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.pageConsumption).toBe(true);
    expect(analysis.realI18nConsumption).toBe(true);
    expect(analysis.inlineLiterals).toEqual([]);
  });
  it.each([
    [
      "direct String message root",
      `import {getText} from "./i18n"; export default function Page(){return String(getText())}`,
    ],
    [
      "direct message ReactNode root",
      `import {getText} from "./i18n"; export default function Page(){return getText()}`,
    ],
    [
      "template message root",
      `import {getText} from "./i18n"; export default function Page(){return \`${"${getText()}"}\`}`,
    ],
  ])("counts accessor-backed scalar React roots: %s", (_name, page) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": page,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Scalar root message"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.pageConsumption).toBe(true);
    expect(analysis.realI18nConsumption).toBe(true);
    expect(analysis.inlineLiterals).toEqual([]);
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
  it.each([
    "@reading-advantage/db/client",
    "@reading-advantage/backend/secrets",
  ])("rejects forbidden server package subpath %s", (specifier) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `import "${specifier}"; export const defaultLocale="en"; const messages={title:"Forbidden subpath copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("allows the browser-safe Marketing constants export", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `import {APPS} from "@reading-advantage/db/marketing-constants"; export const defaultLocale="en"; const messages={title:"Browser-safe constants copy"}; export function getText(){return messages.title + APPS.length}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it("traverses a static local require into the client safety graph", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `const secret=require("./secret"); export const defaultLocale="en"; const messages={title:"Required module copy"}; export function getText(){return messages.title + secret.value}`,
          "secret.ts": `import "server-only"; const key=process.env.API_KEY; export const value="secret"`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.graph.has("secret.ts")).toBe(true);
    expect(analysis.unsafePaths).toContain("secret.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("rejects dynamic require in reachable client code", () => {
    const analysis = analyzeEnvironmentFixture(
      'const moduleName="./secret"; const secret=require(moduleName);',
    );
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("rejects aliased unshadowed require and follows its static module", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `const req=require; const secret=req("./secret"); export const defaultLocale="en"; const messages={title:"Aliased require copy"}; export function getText(){return messages.title}`,
          "secret.ts": `import "server-only"; export const value="secret"`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.graph.has("secret.ts")).toBe(true);
    expect(analysis.unsafePaths).toContain("secret.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("does not treat a locally shadowed require as a module edge", () => {
    const analysis = analyzeEnvironmentFixture(
      'const require=(name)=>({value:name}); const result=require("local");',
    );
    expect(analysis.graph.has("secret.ts")).toBe(false);
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it.each([
    [
      "as-cast alias",
      'const req=require as any; const secret=req("./secret");',
    ],
    ["mutable alias", 'let req=require; const secret=req("./secret");'],
    [
      "bound alias",
      'const req=require.bind(null); const secret=req("./secret");',
    ],
    ["comma require", 'const secret=(0,require)("./secret");'],
    ["module require", 'const secret=module.require("./secret");'],
  ])("closes unshadowed CommonJS variant: %s", (_name, read) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"CommonJS variant copy"}; ${read} export function getText(){return messages.title}`,
          "secret.ts": `import "server-only"; export const value="secret"`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.graph.has("secret.ts")).toBe(true);
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("keeps a local require shadow separate from a real global require", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `function local(require){require("./local")} local((name)=>name); const secret=require("./secret"); export const defaultLocale="en"; const messages={title:"Scoped require copy"}; export function getText(){return messages.title}`,
          "local.ts": `export const value="local"`,
          "secret.ts": `import "server-only"; export const value="secret"`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.graph.has("local.ts")).toBe(false);
    expect(analysis.graph.has("secret.ts")).toBe(true);
    expect(analysis.unsafePaths).toContain("i18n.ts");
  });
  it.each([
    'import("@reading-advantage/db/client");',
    'const p="@reading-advantage/db/client"; import(p);',
    "const p=getSpecifier(); import(p);",
  ])("rejects unsupported reachable dynamic import: %s", (read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("traverses a safe statically resolvable local dynamic import", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `import("./safe-client"); export const defaultLocale="en"; const messages={title:"Safe dynamic copy"}; export function getText(){return messages.title}`,
          "safe-client.ts": `export const safe=true;`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.graph.has("safe-client.ts")).toBe(true);
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it.each([
    ["dot property", "const secret = process.env.API_KEY;"],
    ["quoted environment property", 'const secret = process.env["API_KEY"];'],
    ["quoted process property", 'const secret = process["env"].API_KEY;'],
    [
      "dynamic environment property",
      'const key = "API_KEY"; const secret = process.env[key];',
    ],
    [
      "dynamic process property",
      'const key = "API_KEY"; const secret = process["env"][key];',
    ],
  ])("rejects reachable non-public environment access: %s", (_name, read) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Environment copy"}; ${read} export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it.each([
    ["env alias", "const env=process.env; const secret=env.API_KEY;"],
    [
      "destructured env alias",
      'const {env}=process; const secret=env["API_KEY"];',
    ],
    ["process alias", 'const p=process; const secret=p["env"].API_KEY;'],
    ["globalThis process", "const secret=globalThis.process.env.API_KEY;"],
    [
      "globalThis bracket process",
      'const secret=globalThis["process"]["env"]["API_KEY"];',
    ],
  ])("rejects aliased non-public environment access: %s", (_name, read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("rejects a non-public environment read in a transitive dictionary module", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `import {messages} from "./messages"; export const defaultLocale="en"; export function getText(){return messages.title}`,
          "messages.ts": `const secret = process.env["MARKETING_SECRET"]; export const messages={title:"Transitive environment copy"}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafePaths).toContain("messages.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("rejects aliased non-public environment access in a transitive module", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `import {messages} from "./messages"; export const defaultLocale="en"; export function getText(){return messages.title}`,
          "messages.ts": `const p=process; const secret=p.env.API_KEY; export const messages={title:"Transitive alias copy"}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafePaths).toContain("messages.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it.each([
    [
      "env alias",
      "const env=process.env; const endpoint=env.NEXT_PUBLIC_API_URL;",
    ],
    [
      "destructured env alias",
      'const {env}=process; const endpoint=env["NEXT_PUBLIC_API_URL"];',
    ],
    [
      "process alias",
      'const p=process; const endpoint=p["env"].NEXT_PUBLIC_API_URL;',
    ],
    [
      "globalThis process",
      'const endpoint=globalThis["process"].env.NEXT_PUBLIC_API_URL;',
    ],
  ])("allows only public environment aliases: %s", (_name, read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it("ignores locally shadowed process, globalThis, and env objects", () => {
    for (const read of [
      'const process={env:{API_KEY:"local"}}; const secret=process.env.API_KEY;',
      'const globalThis={process:{env:{API_KEY:"local"}}}; const secret=globalThis.process.env.API_KEY;',
      'const env={API_KEY:"local"}; const secret=env.API_KEY;',
    ]) {
      const analysis = analyzeEnvironmentFixture(read);
      expect(analysis.unsafePaths).toEqual([]);
      expect(analysis.realI18nConsumption).toBe(true);
    }
  });
  it.each([
    ["mutable env alias", "let env=process.env; const secret=env.API_KEY;"],
    [
      "env reassignment",
      "let env={}; env=process.env; const secret=env.API_KEY;",
    ],
    [
      "dynamic env alias",
      'const env=process.env; const key="API_KEY"; const secret=env[key];',
    ],
    [
      "dynamic process alias",
      'const p=process; const key="env"; const secret=p[key].API_KEY;',
    ],
    [
      "unsupported process key",
      'const env=process["en"+"v"]; const secret=env.API_KEY;',
    ],
  ])(
    "fails closed for unsupported environment provenance: %s",
    (_name, read) => {
      const analysis = analyzeEnvironmentFixture(read);
      expect(analysis.unsafePaths).toContain("i18n.ts");
      expect(analysis.realI18nConsumption).toBe(false);
    },
  );
  it.each([
    [
      "globalThis destructured process",
      "const {process:p}=globalThis; const secret=p.env.API_KEY;",
    ],
    [
      "globalThis object alias",
      "const root=globalThis; const secret=root.process.env.API_KEY;",
    ],
    [
      "computed globalThis process alias",
      'const key="process"; const p=globalThis[key]; const secret=p.env.API_KEY;',
    ],
    [
      "function-return process alias",
      "const getProcess=()=>process; const secret=getProcess().env.API_KEY;",
    ],
  ])("rejects global/process provenance bypasses: %s", (_name, read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it.each([
    [
      "conditional process public dot",
      "const getP=()=>true?process:process; const x=getP().env.NEXT_PUBLIC_A;",
    ],
    [
      "conditional process public bracket",
      "const getP=()=>true?process:process; const x=getP()['env']['NEXT_PUBLIC_A'];",
    ],
    [
      "globalThis return public",
      "const getRoot=()=>globalThis; const x=getRoot().process.env.NEXT_PUBLIC_A;",
    ],
  ])("allows safe public call-return environment access: %s", (_name, read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it.each([
    [
      "conditional process private",
      "const getP=()=>true?process:process; const x=getP().env.API_KEY;",
    ],
    [
      "globalThis process private",
      "const getRoot=()=>globalThis; const x=getRoot().process.env.API_KEY;",
    ],
    [
      "globalThis environment object",
      "const getRoot=()=>globalThis; const x=getRoot().process.env;",
    ],
  ])("still rejects private call-return access: %s", (_name, read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("allows public globalThis aliases and function-return process", () => {
    const analysis = analyzeEnvironmentFixture(
      'const key="process"; const root=globalThis; const getProcess=()=>process; const a=root[key].env.NEXT_PUBLIC_A; const b=getProcess().env.NEXT_PUBLIC_B;',
    );
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it("does not treat shadowed globalThis destructuring as process", () => {
    const analysis = analyzeEnvironmentFixture(
      'const globalThis={process:{env:{API_KEY:"local"}}}; const {process:p}=globalThis; const secret=p.env.API_KEY;',
    );
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it.each([
    ["destructured secret", "const {API_KEY}=process.env;"],
    ["nested process env destructuring", "const {env:{API_KEY}}=process;"],
    ["spread environment copy", "const copy={...process.env};"],
    ["environment call escape", "send(process.env);"],
    [
      "conditional process return",
      "const getP=()=>true?process:process; const secret=getP().env.API_KEY;",
    ],
    [
      "identity process escape",
      "const id=(value)=>value; const secret=id(process).env.API_KEY;",
    ],
  ])("rejects environment escape: %s", (_name, read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it.each([
    ["exported env object", "export const leaked=process.env;"],
    ["exported process object", "export const leaked=process;"],
  ])("rejects exported environment escape: %s", (_name, read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toContain("i18n.ts");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it.each([
    ["public env destructuring", "const {NEXT_PUBLIC_API_URL}=process.env;"],
    [
      "public nested process destructuring",
      "const {env:{NEXT_PUBLIC_API_URL}}=process;",
    ],
    [
      "public nested globalThis destructuring",
      "const {process:{env:{NEXT_PUBLIC_API_URL}}}=globalThis;",
    ],
  ])("allows public environment destructuring: %s", (_name, read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it.each([
    ["direct recursion", "function recurse(){return recurse()} recurse();"],
    [
      "mutual recursion",
      "function first(){return second()} function second(){return first()} first();",
    ],
  ])("does not crash on %s", (_name, read) => {
    const analysis = analyzeEnvironmentFixture(read);
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it("allows public environment values and ignores ordinary text or unreachable server files", () => {
    const publicEnvironment = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const endpoint = process.env.NEXT_PUBLIC_API_URL; const messages={title:"Public environment copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    const ordinaryText = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; import type {Unrelated} from "./unrelated"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const process={env:{API_KEY:"local"}}; const processLabel="process.env.API_KEY"; const messages={title:"Ordinary process text"}; export function getText(){return messages.title}`,
          "unrelated.ts": `import "server-only"; const secret = process.env.API_KEY; export type Unrelated = typeof secret`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(publicEnvironment.unsafePaths).toEqual([]);
    expect(publicEnvironment.realI18nConsumption).toBe(true);
    expect(ordinaryText.unsafePaths).toEqual([]);
    expect(ordinaryText.realI18nConsumption).toBe(true);
  });
  it("preserves ordinary browser globals and local server-named modules", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "i18n.ts": `import "./server-status"; const storage=globalThis.localStorage; const request=globalThis.fetch; if(typeof process !== "undefined") {}; export const defaultLocale="en"; const messages={title:"Browser globals copy"}; export function getText(){return messages.title}`,
          "server-status.ts": `export const status="ready";`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.graph.has("server-status.ts")).toBe(true);
    expect(analysis.unsafePaths).toEqual([]);
    expect(analysis.realI18nConsumption).toBe(true);
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
  it("surfaces hardcoded dangerouslySetInnerHTML copy as an unsafe sink", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `export default function Page(){return <div dangerouslySetInnerHTML={{__html:"Hardcoded HTML copy"}} />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toContain("Hardcoded HTML copy");
    expect(analysis.unsafeSinks).toContain("page.tsx: dangerouslySetInnerHTML");
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("fails closed for a JSX spread carrying dangerouslySetInnerHTML", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `const props={dangerouslySetInnerHTML:{__html:"Spread HTML copy"}}; export default function Page(){return <div {...props} />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafeSinks).toContain("page.tsx: dangerouslySetInnerHTML");
    expect(analysis.inlineLiterals.join("\n")).toContain("Spread HTML copy");
  });
  it("finds hardcoded React.createElement children", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `export default function Page(){return React.createElement("p",null,"Hardcoded createElement copy")}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toContain(
      "Hardcoded createElement copy",
    );
  });
  it("finds visible React.createElement props but preserves technical props", () => {
    const visible = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import ReactAlias from "react"; const h=ReactAlias.createElement; const props={title:"CreateElement title",label:"Launch ready","aria-label":"Start launch"}; const StatusBadge=()=>null; export default function Page(){return h(StatusBadge,props)}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    const technical = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import * as R from "react"; export default function Page(){return R.createElement("div",{id:"technical-id","data-testid":"launch"})}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(visible.inlineLiterals.join("\n")).toEqual(
      expect.stringContaining("CreateElement title"),
    );
    expect(visible.inlineLiterals.join("\n")).toEqual(
      expect.stringContaining("Launch ready"),
    );
    expect(technical.inlineLiterals).toEqual([]);
  });
  it("recognizes destructured React.createElement aliases", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import R from "react"; const {createElement:h}=R; import {getText} from "./i18n"; export default function Page(){return h("p",{label:"Hardcoded label",id:"technical-id"},getText())}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Destructured accessor copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toContain("Hardcoded label");
    expect(analysis.inlineLiterals.join("\n")).not.toContain("technical-id");
    expect(analysis.realI18nConsumption).toBe(true);
  });
  it("surfaces dangerous React.createElement HTML props", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {createElement} from "react"; export default function Page(){return createElement("div",{dangerouslySetInnerHTML:{__html:"CreateElement HTML copy"}})}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.unsafeSinks).toContain("page.tsx: dangerouslySetInnerHTML");
    expect(analysis.inlineLiterals.join("\n")).toContain(
      "CreateElement HTML copy",
    );
  });
  it.each([
    [
      "imported alias",
      `import {createElement as h} from "react"; export default function Page(){return h("p",null,"Imported createElement copy")}`,
    ],
    [
      "namespace alias",
      `import * as R from "react"; export default function Page(){return R.createElement("p",null,"Namespace createElement copy")}`,
    ],
  ])("finds aliased React.createElement children: %s", (_name, source) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph({ "page.tsx": source }, ["page.tsx"]),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toMatch(
      /(?:Imported|Namespace) createElement copy/,
    );
  });
  it("finds visible submit input labels but not ordinary input state", () => {
    const visible = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `export default function Page(){return <input type="submit" value="Submit campaign" />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    const state = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `export default function Page(){return <input type="text" value="Current state" />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(visible.inlineLiterals.join("\n")).toContain("Submit campaign");
    expect(state.inlineLiterals).toEqual([]);
  });
  it("resolves expression-valued intrinsic input types", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `const submitType="submit"; export default function Page(){return <input type={submitType} value="Expression submit" />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toContain("Expression submit");
  });
  it("resolves conditional and object-derived visible input types", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `const active=true; const types={action:"submit"}; export default function Page(){return <input type={active?"text":types.action} value="Derived submit" />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.inlineLiterals.join("\n")).toContain("Derived submit");
  });
  it("accepts safe JSX spreads and rejects unresolved spreads", () => {
    const safe = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `const props={id:"technical-id"}; export default function Page(){return <div {...props} />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    const unresolved = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `declare function getProps(): object; const props=getProps(); export default function Page(){return <div {...props} />}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(safe.unsafeSinks).toEqual([]);
    expect(unresolved.unsafeSinks).toContain("page.tsx: jsx-spread");
  });
  it("treats hardcoded metadata title and description as visible copy", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import {getText} from "./i18n"; export default function Page(){return <p>{getText()}</p>}`,
          "layout.tsx": `export const metadata={title:"Hardcoded metadata title",description:"Hardcoded metadata description"}; export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Dictionary metadata copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx", "layout.tsx"],
      ),
      ["page.tsx"],
      "layout.tsx",
    );
    expect(analysis.inlineLiterals.join("\n")).toEqual(
      expect.stringContaining("Hardcoded metadata title"),
    );
    expect(analysis.inlineLiterals.join("\n")).toEqual(
      expect.stringContaining("Hardcoded metadata description"),
    );
  });
  it("finds quoted, nested, template, and generated metadata copy", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `export default function Page(){return <p>Page</p>}`,
          "layout.tsx": `const metadata={"title":{"default":"Nested metadata title","template":"%s | Site"},"description":"Quoted metadata description"}; export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}`,
          "generated.ts": `export async function generateMetadata(){return {title:"Generated metadata title",description:"Generated metadata description"}}`,
        },
        ["page.tsx", "layout.tsx", "generated.ts"],
      ),
      ["page.tsx", "generated.ts"],
      "layout.tsx",
    );
    expect(analysis.inlineLiterals.join("\n")).toEqual(
      expect.stringContaining("Nested metadata title"),
    );
    expect(analysis.inlineLiterals.join("\n")).toEqual(
      expect.stringContaining("Generated metadata description"),
    );
  });
  it("finds aliased and indirect metadata objects", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `export default function Page(){return <p>Page</p>}`,
          "layout.tsx": `const shared={title:"Indirect metadata title",description:"Indirect metadata description"}; const pageMetadata=shared; export {pageMetadata as metadata}; export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}`,
          "generated.ts": `const generated={title:{default:"Generated default title",template:"%s | Generated"},description:"Generated alias description"}; export const generateMetadata=()=>generated;`,
        },
        ["page.tsx", "layout.tsx", "generated.ts"],
      ),
      ["page.tsx", "generated.ts"],
      "layout.tsx",
    );
    expect(analysis.inlineLiterals.join("\n")).toEqual(
      expect.stringContaining("Indirect metadata title"),
    );
    expect(analysis.inlineLiterals.join("\n")).toEqual(
      expect.stringContaining("Generated default title"),
    );
    const exported = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `export default function Page(){return <p>Page</p>}`,
          "layout.tsx": `const shared={title:"Exported metadata title",description:"Exported metadata description"}; export const metadata=shared; export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}`,
        },
        ["page.tsx", "layout.tsx"],
      ),
      ["page.tsx"],
      "layout.tsx",
    );
    expect(exported.inlineLiterals.join("\n")).toContain(
      "Exported metadata description",
    );
  });
  it.each([
    [
      "unused JSX helper",
      `import {getText} from "./i18n"; function Hidden(){return <p>{getText()}</p>} export default function Page(){return <div />}`,
    ],
    [
      "unused setter helper",
      `import {getText} from "./i18n"; function unused(){setLabel(getText())} export default function Page(){return <div />}`,
    ],
  ])("does not count %s as rendered accessor output", (_name, page) => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": page,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Unused rendered copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.pageConsumption).toBe(false);
    expect(analysis.realI18nConsumption).toBe(false);
  });
  it("does not count a side-effect imported translated component", () => {
    const analysis = analyzeI18nGraph(
      buildFixtureGraph(
        {
          "page.tsx": `import "./translated"; export default function Page(){return <div />}`,
          "translated.tsx": `import {getText} from "./i18n"; export default function Translated(){return <p>{getText()}</p>}`,
          "i18n.ts": `export const defaultLocale="en"; const messages={title:"Side effect copy"}; export function getText(){return messages.title}`,
        },
        ["page.tsx"],
      ),
      ["page.tsx"],
    );
    expect(analysis.pageConsumption).toBe(false);
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
