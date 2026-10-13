import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { describe, expect, it } from "vitest";
import { PRINT_KIT } from "../kit.generated.js";
import { printLessonSchema, renderPrintLessonOutputSchema } from "../contracts.js";
import { renderPrintLesson } from "../render.js";
import { legacyWorkbookLessonSchema } from "../../../workbooks/legacy-workbook-importer.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "__fixtures__");
const printLesson = printLessonSchema.parse(JSON.parse(readFileSync(join(dir, "origins-3.2-5@08bb160.json"), "utf8")));
const golden = readFileSync(join(dir, "origins-3.2-5-no-key-body@08bb160.html"), "utf8");

/** A QR data URL; Handlebars writes the base64 padding "=" as "&#x3D;". */
const QR_URL = /data:image\/svg\+xml;base64,[A-Za-z0-9+/]+(?:=|&#x3D;)*/g;
const svgOf = (url: string) => Buffer.from(url.split(",")[1]!.replaceAll("&#x3D;", "="), "base64").toString("utf8");
/** Collapses whitespace. A QR data URL becomes its module count: qrcode and qrcode-generator pick another mask. */
const norm = (html: string) =>
  html
    .replace(QR_URL, (url) => `QR${/width="(\d+)"/.exec(svgOf(url))?.[1]}`)
    .replace(/\s+/g, " ")
    .trim();
const bodyOf = (html: string) => html.slice(html.indexOf("<body>") + 6, html.lastIndexOf("</body>"));
const TITLES = [
  "Before You Read", "Key Vocabulary", "Read the Article", "Collect Vocabulary", "Deep Reading Notes",
  "Collect Sentences", "Comprehension Check", "Guided Response", "Vocabulary Practice", "Sentence Practice",
  "Guided Writing", "Language Questions", "Lesson Reflection",
];

describe("renderPrintLesson", () => {
  const html = renderPrintLesson({ printLesson });

  it("returns one HTML document that matches the output contract", () => {
    expect(() => renderPrintLessonOutputSchema.parse(html)).not.toThrow();
    expect(html).toContain('<html lang="en">');
    expect(renderPrintLesson({ printLesson, locale: "th" })).toContain('<html lang="th">');
  });

  it("prints the 13 step titles in order and the lesson title", () => {
    const titles = [...html.matchAll(/<h2 class="section-title">([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(titles).toEqual(TITLES);
    expect(html).toContain("At the Market");
  });

  it("names the product once in the header", () => {
    expect(html.match(/class="workbook-title">([^<]*)</g)).toEqual(['class="workbook-title">Primary Advantage • Origins 3.2 • A0+<']);
  });

  it("prints QR codes for the article and the writing step", () => {
    const qr = html.match(QR_URL) ?? [];
    expect(qr).toHaveLength(golden.match(QR_URL)?.length ?? -1);
    expect(qr.length).toBe(2);
    const svg = svgOf(qr[0]!);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="410"');
  });

  it("prints the Thai translation page", () => {
    expect(html).toMatch(/[฀-๿]{10}/);
    expect(html).toContain("thai-translation");
  });

  it("escapes text and keeps only the vocab_fill blank span", () => {
    const evil = structuredClone(printLesson);
    evil.lesson.lesson_title = "A <img src=x onerror=alert(1)> & B";
    evil.lesson.vocabulary![0]!.definition = "<script>alert(1)</script>";
    const out = renderPrintLesson({ printLesson: evil });
    expect(out).not.toContain("<img src=x");
    expect(out).not.toContain("<script>alert(1)");
    expect(out).toContain("A &lt;img src&#x3D;x onerror&#x3D;alert(1)&gt; &amp; B");
    const blanks = [...out.matchAll(/class="blank"/g)].length;
    expect(blanks).toBe([...golden.matchAll(/class="blank"/g)].length);
  });

  it("escapes an <img onerror> in a vocab_fill sentence and keeps the blank span", () => {
    const evil = structuredClone(printLesson);
    evil.lesson.vocab_fill = [{ number: 1, sentence: `Go <img src=x onerror=alert(1)> to the <span class="blank"></span> now` }];
    const out = renderPrintLesson({ printLesson: evil });
    expect(out).not.toContain("<img src=x");
    expect(out).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(out).toContain('<span class="blank"></span>');
  });

  it("gives the template only fields that the print data or the render step supplies", () => {
    const derived: string[] = ["lesson_number", "series_name", "series_level", "series_tagline", "article_image_url", "article_images", "qr_code_url", "writing_qr_code_url", "images_hero", "images_vocabulary", "images_writing_prompt", "images_inline"];
    // Workbooks sets `header_strip` from a render option (cover insert); the app sets no option.
    derived.push("header_strip");
    const supplied = new Set([...Object.keys(legacyWorkbookLessonSchema.shape), "writing_practice_url", ...Object.keys(printLesson.lesson), ...derived]);
    const used = new Set<string>();
    type Node = { type: string; path?: { original: string; data?: boolean; depth?: number; parts?: unknown[] }; params?: Node[]; hash?: { pairs: { value: Node }[] }; program?: { body: Node[] }; inverse?: { body: Node[] }; body?: Node[] };
    const walk = (nodes: Node[], inLoop: boolean) => {
      for (const node of nodes) {
        const isCall = (node.params?.length ?? 0) > 0 || (node.hash?.pairs.length ?? 0) > 0;
        const params = [...(node.params ?? []), ...(node.hash?.pairs.map((pair) => pair.value) ?? [])];
        const visit = (n: Node) => {
          if (n.type === "PathExpression" && !inLoop && !n.path && !(n as unknown as { data?: boolean }).data && (n as unknown as { depth: number }).depth === 0) {
            const first = (n as unknown as { parts: string[] }).parts[0];
            if (first) used.add(first);
          }
          if (n.type === "SubExpression") walk([n], inLoop);
        };
        for (const param of params) visit(param);
        if (node.type === "MustacheStatement" && !isCall) visit(node.path as unknown as Node);
        if (node.type === "BlockStatement") {
          const name = node.path?.original;
          if (!inLoop) for (const param of node.params ?? []) visit(param);
          const loops = inLoop || name === "each" || name === "with";
          walk(node.program?.body ?? [], loops);
          walk(node.inverse?.body ?? [], inLoop);
        }
      }
    };
    walk((Handlebars.parse(PRINT_KIT.template) as unknown as { body: Node[] }).body, false);
    expect(used.size).toBeGreaterThan(10);
    expect([...used].filter((name) => !supplied.has(name))).toEqual([]);
  });

  it("sets @page to A4 with a 20 mm margin and no theme token", () => {
    expect(html).toMatch(/@page\s*{\s*size: 210mm 297mm;\s*margin: 20mm;/);
    expect(html).not.toContain("__THEME_");
    expect(html).toContain("#228b22");
  });

  it("points the 17 font faces at /print-fonts/ with files from the kit", () => {
    const faces = [...html.matchAll(/@font-face \{[^}]*url\(\/print-fonts\/([^)]+)\)/g)].map((m) => m[1]!);
    expect(faces).toHaveLength(17);
    for (const f of faces) expect(PRINT_KIT.fonts).toContain(f);
    expect(html).not.toContain("data:font/");
  });

  it("has no external script and carries the print bridge", () => {
    expect(html).not.toContain("unpkg.com");
    expect(html).toContain("workbook:print");
  });

  it("has a body equal to the Workbooks golden fixture (whitespace normalized)", () => {
    expect(norm(bodyOf(html))).toBe(norm(golden));
  });
});
