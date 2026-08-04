import type { WorkbookNormalizedContent } from "../contracts.js";
import type { TeacherManualOptions } from "./types.js";
import type { SupportedLanguage } from "./i18n/index.js";
import { getThemeColors } from "./theme.js";
import { generateFrontMatter } from "./front-matter.js";
import { generateEndMatter } from "./end-matter.js";
import { buildLessonPlan, renderLessonPlan } from "./lesson-plan.js";
import { wrapTeacherManualDocument } from "./document-wrapper.js";
import { toTeacherManualLesson } from "./lesson-adapter.js";

export interface CompileTeacherManualResult {
  html: string;
  lessonCount: number;
}

/**
 * Compiles normalized workbook contents into a single teacher's manual HTML
 * document: front matter, one lesson plan per content (in order), and end
 * matter, wrapped by the Paged.js-ready document shell.
 * @param lessons Normalized lesson contents to compile into the manual.
 * @param seriesName Display name of the series, interpolated into the theme,
 * title page, and preface.
 * @param seriesLevel Level label shown on the title page and preface.
 * @param cefrLevel CEFR label shown in each lesson plan's metadata.
 * @param type Whether the series is a primary or secondary course.
 * @param lang Language code for the translation bundle, defaults to English.
 * @returns The complete manual HTML and the number of lessons compiled.
 */
export function compileTeacherManual(
  lessons: WorkbookNormalizedContent[],
  seriesName: string,
  seriesLevel: string,
  cefrLevel: string,
  type: "primary" | "secondary" = "primary",
  lang: SupportedLanguage = "en"
): CompileTeacherManualResult {
  const theme = getThemeColors(seriesName, type);
  const options: TeacherManualOptions = {
    seriesName,
    seriesLevel,
    cefrLevel,
    type,
    theme,
    lang,
  };

  const frontMatterHtml = generateFrontMatter(
    { seriesName, seriesLevel, cefrLevel },
    theme,
    lang
  );

  const lessonPlansHtml = lessons.map((lesson, index) => {
    const plan = buildLessonPlan(
      toTeacherManualLesson(lesson),
      index,
      cefrLevel,
      lang
    );
    return renderLessonPlan(plan, theme, lang);
  }).join("\n");

  const endMatterHtml = generateEndMatter(
    { seriesName, seriesLevel },
    theme,
    lang
  );

  const fullHtml = wrapTeacherManualDocument(
    frontMatterHtml,
    lessonPlansHtml,
    endMatterHtml,
    options
  );

  return {
    html: fullHtml,
    lessonCount: lessons.length,
  };
}
