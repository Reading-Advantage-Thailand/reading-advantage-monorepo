import type { LegacyWorkbookLesson } from "../legacy-workbook-importer.js";
import type { LessonPlan } from "./types.js";
import type { SupportedLanguage } from "./i18n/index.js";
import { getTranslations } from "./i18n/index.js";
import { buildPeriodPlan, renderPeriodPlan } from "./period-plan.js";
import { escapeHtml } from "./theme.js";

/**
 * Builds the lesson-plan data model for a single legacy lesson: objectives,
 * four period plans, and the vocabulary word/definition overview list.
 * @param lesson The legacy lesson to map into a lesson plan.
 * @param lessonIndex Zero-based index of the lesson in the manual.
 * @param cefrLevel CEFR label shown in the plan metadata.
 * @param lang Language code for the translation bundle, defaults to English.
 * @returns The lesson-plan model consumed by renderLessonPlan.
 */
export function buildLessonPlan(
  lesson: LegacyWorkbookLesson,
  lessonIndex: number,
  cefrLevel: string,
  lang: SupportedLanguage = "en"
): LessonPlan {
  const t = getTranslations(lang);
  const lp = t.lessonPlan;
  const lessonNumber = lessonIndex + 1;
  const vocabulary = (lesson.vocabulary || []).map(v => ({
    word: v.word,
    definition: v.definition,
  }));

  const objectives = [
    lp.objectiveRead(lesson.genre || "", lesson.lesson_title || lp.untitled),
    lp.objectiveVocab,
    lp.objectiveComprehension,
    lp.objectiveWriting,
  ];

  const periods = [1, 2, 3, 4].map(pn =>
    buildPeriodPlan(pn, lesson, lessonIndex, undefined, lang)
  );

  return {
    lessonNumber,
    lessonTitle: lesson.lesson_title || lp.untitled,
    cefrLevel,
    genre: lesson.genre,
    articleType: lesson.article_type,
    objectives,
    periods,
    vocabulary,
  };
}

/**
 * Renders a lesson-plan model to the teacher-manual HTML block for the lesson.
 * @param plan The lesson-plan model to render.
 * @param theme Optional primary color used for headers and accents.
 * @param lang Language code for the translation bundle, defaults to English.
 * @returns The lesson-plan HTML including metadata, objectives, vocabulary
 * overview, and the four rendered period plans.
 */
export function renderLessonPlan(
  plan: LessonPlan,
  theme?: { primary: string },
  lang: SupportedLanguage = "en"
): string {
  const primaryColor = theme?.primary || "#1e40af";
  const t = getTranslations(lang);
  const lp = t.lessonPlan;

  const periodsHtml = plan.periods.map(p =>
    renderPeriodPlan(p, plan.lessonNumber - 1, theme, lang)
  ).join('\n');

  const vocabHtml = plan.vocabulary.length > 0 ? `
    <div class="tm-vocab-overview">
      <h4 class="tm-vocab-title" style="color: ${primaryColor};">${escapeHtml(lp.lessonVocabulary)}</h4>
      <div class="tm-vocab-grid">
        ${plan.vocabulary.map(v => `
          <div class="tm-vocab-item">
            <strong>${escapeHtml(v.word)}</strong>: ${escapeHtml(v.definition)}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `
    <div class="tm-lesson-plan" id="lesson-${plan.lessonNumber}">
      <div class="tm-lesson-header" style="background: linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05); border-left: 4px solid ${primaryColor};">
        <h2 class="tm-lesson-title" style="color: ${primaryColor};">${escapeHtml(lp.lesson)} ${plan.lessonNumber}: ${escapeHtml(plan.lessonTitle)}</h2>
        <div class="tm-lesson-meta">
          ${plan.genre ? `<span class="tm-meta-item"><strong>${escapeHtml(lp.genre)}:</strong> ${escapeHtml(plan.genre)}</span>` : ''}
          ${plan.articleType ? `<span class="tm-meta-item"><strong>${escapeHtml(lp.type)}:</strong> ${escapeHtml(plan.articleType)}</span>` : ''}
          <span class="tm-meta-item"><strong>${escapeHtml(lp.cefr)}:</strong> ${escapeHtml(plan.cefrLevel)}</span>
          <span class="tm-meta-item"><strong>${escapeHtml(lp.duration)}:</strong> ${escapeHtml(lp.durationValue)}</span>
        </div>
      </div>
      <div class="tm-lesson-objectives">
        <h4 style="color: ${primaryColor};">${escapeHtml(lp.objectives)}</h4>
        <ul>
          ${plan.objectives.map(o => `<li>${escapeHtml(o)}</li>`).join('')}
        </ul>
      </div>
      ${vocabHtml}
      ${periodsHtml}
    </div>
  `;
}
