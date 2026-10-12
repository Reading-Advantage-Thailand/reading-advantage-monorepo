import Handlebars from "handlebars";
import QRCode from "qrcode";
import { PRINT_BRIDGE_SHIM } from "../../workbooks/print-bridge.js";
import {
  PRINT_THEME_TOKENS,
  renderPrintLessonInputSchema,
  renderPrintLessonOutputSchema,
  type PrintLesson,
  type RenderPrintLessonInput,
} from "./contracts.js";
import { PRINT_KIT } from "./kit.generated.js";

/** CSS page size of A4 paper (Workbooks `A4_PAGE`). */
const A4_PAGE = "210mm 297mm";
/** Thai glyph range of the Sarabun faces (Workbooks `THAI`). */
const THAI = "U+0E01-0E5B, U+200C-200D, U+25CC";
const BLANK = '<span class="blank"></span>';

type FontStyle = "normal" | "italic";
/** One static print font face: family, weights and styles, and the file name pattern in `public/print-fonts/`. */
const FONT_FACES: Array<[family: string, slug: string, subset: string, list: Array<[number, FontStyle]>, range?: string]> = [
  ["Merriweather", "merriweather", "latin", [[300, "normal"], [400, "normal"], [400, "italic"], [600, "normal"], [700, "normal"], [700, "italic"]]],
  ["Open Sans", "open-sans", "latin", [[400, "normal"], [400, "italic"], [600, "normal"], [700, "normal"], [700, "italic"], [800, "normal"]]],
  ["Sarabun", "sarabun", "thai", [[400, "normal"], [400, "italic"], [600, "normal"], [700, "normal"], [700, "italic"]], THAI],
];

/**
 * The `@font-face` rules of the print document. They point at `/print-fonts/` (the Workbooks
 * document embeds each file as a data URL instead).
 * @returns The CSS text, one rule per line.
 */
function fontFaceCss(): string {
  return FONT_FACES.flatMap(([family, slug, subset, list, range]) =>
    list.map(
      ([weight, style]) =>
        `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: ${style}; src: url(/print-fonts/${slug}-${subset}-${weight}-${style}.woff2) format('woff2');${range ? ` unicode-range: ${range};` : ""} }`,
    ),
  ).join("\n");
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

/** Series colors by series name (port of Workbooks `getThemeColors` for the primary type). */
function themeColors(seriesName: string): { primary: string; secondary: string; gradient: string } {
  const name = seriesName.toLowerCase();
  const pairs: Array<[string, string, string, string?]> = [
    ["origins", "#228b22", "#8b4513"],
    ["quest", "#0284c7", "#eab308", "#0ea5e9"],
    ["adventure", "#4c1d95", "#475569"],
    ["hero", "#be123c", "#b45309"],
    ["legend", "#1e3a8a", "#ca8a04"],
  ];
  const hit = pairs.find(([key]) => name.includes(key));
  const [primary, secondary, from] = hit ? [hit[1], hit[2], hit[3] ?? hit[1]] : ["#0284c7", "#334155", "#0284c7"];
  return { primary, secondary, gradient: `linear-gradient(135deg, ${from}, ${secondary})` };
}

/** Icon paths from the kit icons source (a Lucide map). The source is generated, not user input. */
const ICON_PATHS: Record<string, string> = (() => {
  const body = /const PATHS = (\{[\s\S]*?\n\}) as const;/.exec(PRINT_KIT.iconsSource)?.[1];
  if (!body) throw new Error("print kit: icon map not found");
  return new Function(`return ${body}`)() as Record<string, string>;
})();

/**
 * One inline SVG icon, 1em high (port of the Workbooks `icon`).
 * @param name Icon name in the kit map.
 * @param filled Fill the shape with the text color.
 * @returns The SVG markup.
 * @throws When the kit has no icon of that name.
 */
function icon(name: string, filled: boolean): string {
  const paths = ICON_PATHS[name];
  if (paths === undefined) throw new Error(`print kit: unknown icon "${name}"`);
  return `<svg class="icon icon-${name}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

/**
 * A QR code as an SVG data URL, with the quiet zone and cell size of Workbooks `generateQRCode`.
 * @param url The text the code carries.
 * @returns The data URL, or undefined for an empty text.
 */
function qrDataUrl(url: string | undefined): string | undefined {
  if (!url || url.trim() === "") return undefined;
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const cell = 10;
  const margin = 4;
  const size = modules.size;
  const total = (size + margin * 2) * cell;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><g transform="translate(${margin * cell}, ${margin * cell})">`;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules.get(row, col)) svg += `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="#000000"/>`;
    }
  }
  return `data:image/svg+xml;base64,${Buffer.from(`${svg}</g></svg>`).toString("base64")}`;
}

type Img = { url: string; caption?: string; position: string };
type Lesson = PrintLesson["lesson"] & Record<string, unknown>;

/**
 * Port of Workbooks `prepareLessonData`: the lesson fields plus the series header, the images
 * grouped by position, and the QR codes. Pictures come from `article_images`, or from a legacy
 * `article_image_url` list.
 * @param print The print data of one lesson.
 * @returns The Handlebars context.
 */
function prepareLessonData(print: PrintLesson): Record<string, unknown> {
  const lesson = print.lesson as Lesson;
  const legacy = Array.isArray(lesson.article_image_url) ? (lesson.article_image_url as unknown[]) : [];
  const articleImages: Img[] =
    ((lesson.article_images as Img[] | undefined) ?? []).length > 0
      ? (lesson.article_images as Img[])
      : legacy
          .filter((u): u is string => typeof u === "string" && u.trim() !== "")
          .map((u, i) => ({
            url: u.trim(),
            caption: (lesson.article_caption as string | undefined) || `Article image ${i + 1}`,
            position: `inline-para-${Math.min(i + 1, 5)}`,
          }));
  const articleUrl = lesson.article_url as string | undefined;
  const writingUrl =
    (lesson.writing_practice_url as string | undefined) ??
    (articleUrl ? `${articleUrl.endsWith("/") ? articleUrl.slice(0, -1) : articleUrl}/writing` : undefined);
  const imageUrl = lesson.article_image_url;
  const vocabFill = ((lesson.vocab_fill as Array<{ number: number; sentence: string }> | undefined) ?? []).map((item) => ({
    ...item,
    // Escape the sentence; keep only the exact blank span. Quotes stay as they are in element text.
    sentence: String(item.sentence)
      .split(BLANK)
      .map((part) => part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
      .join(BLANK),
  }));
  const inline: Record<string, Img[]> = {};
  for (const img of articleImages) if (img.position.startsWith("inline-para-")) (inline[img.position] ??= []).push(img);
  return {
    ...lesson,
    lesson_number: `Lesson ${print.lessonNumber}`,
    series_name: print.seriesName,
    series_level: print.seriesLevel,
    series_tagline: "",
    article_image_url: typeof imageUrl === "string" && imageUrl.trim() !== "" ? imageUrl.trim() : undefined,
    article_images: articleImages,
    qr_code_url: qrDataUrl(articleUrl),
    writing_qr_code_url: qrDataUrl(writingUrl),
    images_hero: articleImages.filter((i) => i.position === "hero"),
    images_vocabulary: articleImages.filter((i) => i.position === "vocabulary"),
    images_writing_prompt: articleImages.filter((i) => i.position === "writing-prompt"),
    images_inline: inline,
    ...(lesson.vocab_fill ? { vocab_fill: vocabFill } : {}),
  };
}

const hbs = Handlebars.create();
hbs.registerHelper("icon", (name: string, options: Handlebars.HelperOptions) =>
  new hbs.SafeString(icon(name, options.hash?.filled === true)),
);
hbs.registerHelper("concat", (...args: unknown[]) => args.slice(0, -1).join(""));
const compiled = hbs.compile(PRINT_KIT.template);

/**
 * Renders one lesson with the Workbooks primary template as an A4 HTML document with no cover and
 * no answer key page. The document loads fonts from `/print-fonts/` and carries the print bridge.
 * Every field is escaped; only the blank span of `vocab_fill` keeps its markup.
 * @param input The print data of the lesson and the locale (sets `<html lang>`).
 * @returns The HTML document for a sandboxed frame.
 * @throws When the print data fails the contract.
 */
export function renderPrintLesson(input: RenderPrintLessonInput): string {
  const { printLesson, locale } = renderPrintLessonInputSchema.parse(input);
  const theme = themeColors(printLesson.seriesName);
  const css = PRINT_KIT.css
    .replaceAll(PRINT_THEME_TOKENS.primary, theme.primary)
    .replaceAll(PRINT_THEME_TOKENS.secondary, theme.secondary)
    .replaceAll(PRINT_THEME_TOKENS.gradient, theme.gradient);
  const lessonHtml = `<div id="lesson-0" class="lesson-section">${compiled(prepareLessonData(printLesson))}</div>`;
  return renderPrintLessonOutputSchema.parse(`<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>Primary Advantage Workbook - ${escapeHtml(printLesson.seriesName)}</title>
  <style>
${fontFaceCss()}
  </style>
  <style>
    ${css}
  </style>
${PRINT_BRIDGE_SHIM}</head>
<body>
  ${lessonHtml}
  
</body>
</html>`);
}
