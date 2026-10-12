import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRINT_KIT } from "../kit.generated.js";
import { printLessonSchema, renderPrintLessonOutputSchema } from "../contracts.js";
import { renderPrintLesson } from "../render.js";

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
    evil.lesson.vocabulary[0]!.definition = "<script>alert(1)</script>";
    const out = renderPrintLesson({ printLesson: evil });
    expect(out).not.toContain("<img src=x");
    expect(out).not.toContain("<script>alert(1)");
    expect(out).toContain("A &lt;img src&#x3D;x onerror&#x3D;alert(1)&gt; &amp; B");
    const blanks = [...out.matchAll(/class="blank"/g)].length;
    expect(blanks).toBe([...golden.matchAll(/class="blank"/g)].length);
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
