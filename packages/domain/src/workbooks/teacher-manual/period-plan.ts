import type { LegacyWorkbookLesson } from "../legacy-workbook-importer.js";
import type { PeriodPlan, BellRingerActivity, SpellingActivity } from "./types.js";
import type { SupportedLanguage } from "./i18n/index.js";
import { getTranslations } from "./i18n/index.js";
import { PERIOD_MAP, STEP_TITLES } from "./types.js";
import { renderStepInsert } from "./step-insert.js";
import { getTeachingNotes, renderTeachingNotes } from "./teaching-notes.js";
import { escapeHtml } from "./theme.js";

function getBellRinger(periodNumber: number, _lessonIndex: number, t: ReturnType<typeof getTranslations>): BellRingerActivity {
  const pp = t.periodPlan;

  if (periodNumber === 1) {
    return {
      type: 'flashcard-cutout',
      title: pp.flashcardCutout,
      duration: pp.fiveMinutes,
      instructions: pp.flashcardCutoutInstructions,
    };
  }

  return {
    type: 'flashcard-game',
    title: pp.flashcardGame,
    duration: pp.fiveMinutes,
    instructions: pp.flashcardGameInstructions,
    gameVariations: [pp.memoryMatch, pp.goFish, pp.snap, pp.quizShow],
  };
}

function getSpellingActivity(periodNumber: number, t: ReturnType<typeof getTranslations>): SpellingActivity | undefined {
  const pp = t.periodPlan;

  switch (periodNumber) {
    case 2:
      return {
        type: 'trace',
        title: pp.traceTitle,
        instructions: pp.traceInstructions,
      };
    case 3:
      return {
        type: 'write',
        title: pp.writeTitle,
        instructions: pp.writeInstructions,
      };
    case 4:
      return {
        type: 'cover-write',
        title: pp.coverWriteTitle,
        instructions: pp.coverWriteInstructions,
      };
    default:
      return undefined;
  }
}

function getOnlineComponents(periodNumber: number, t: ReturnType<typeof getTranslations>): string[] {
  const pp = t.periodPlan;

  switch (periodNumber) {
    case 1:
      return [pp.onlineReading];
    case 2:
      return [pp.extensiveReading];
    case 3:
      return [pp.vocabReview];
    case 4:
      return [pp.aiFeedback, pp.progressTracker];
    default:
      return [];
  }
}

/**
 * Builds the period-plan data model for one of the four class periods of a
 * lesson: the PERIOD_MAP step grouping, step inserts, teaching notes, bell
 * ringer, spelling activity, and online components.
 * @param periodNumber The 1-based period number (1-4) to build.
 * @param lesson The legacy lesson the period's steps operate on.
 * @param lessonIndex Zero-based index of the lesson in the manual.
 * @param _theme Reserved for theme injection; not currently used.
 * @param lang Language code for the translation bundle, defaults to English.
 * @returns The period-plan model consumed by renderPeriodPlan.
 */
export function buildPeriodPlan(
  periodNumber: number,
  lesson: LegacyWorkbookLesson,
  lessonIndex: number,
  _theme?: { primary: string },
  lang: SupportedLanguage = "en"
): PeriodPlan {
  const t = getTranslations(lang);
  const pp = t.periodPlan;
  const periodDef = PERIOD_MAP[periodNumber];
  const steps = periodDef.steps;

  const stepInserts = steps.map(stepNum => ({
    stepNumber: stepNum,
    stepTitle: STEP_TITLES[stepNum],
    lessonData: lesson,
    lessonIndex,
  }));

  const teachingNotes = new Map<number, ReturnType<typeof getTeachingNotes>>();
  steps.forEach(stepNum => {
    teachingNotes.set(stepNum, getTeachingNotes(stepNum, lesson, lang));
  });

  const periodTitles: Record<number, string> = {
    1: pp.launchVocabulary,
    2: pp.deepReadingComprehension,
    3: pp.responsePractice,
    4: pp.writingReflection,
  };

  return {
    periodNumber,
    title: periodTitles[periodNumber] || periodDef.title,
    steps: stepInserts,
    teachingNotes,
    bellRinger: getBellRinger(periodNumber, lessonIndex, t),
    spellingActivity: getSpellingActivity(periodNumber, t),
    onlineComponents: getOnlineComponents(periodNumber, t),
  };
}

/**
 * Renders a period-plan model to the teacher-manual HTML block: bell-ringer,
 * step inserts with their teaching notes, spelling activity, and online
 * components.
 * @param period The period-plan model to render.
 * @param _lessonIndex Reserved for lesson numbering; not currently used.
 * @param theme Optional primary color used for headers and accents.
 * @param lang Language code for the translation bundle, defaults to English.
 * @returns The period-plan HTML block.
 */
export function renderPeriodPlan(
  period: PeriodPlan,
  _lessonIndex: number,
  theme?: { primary: string },
  lang: SupportedLanguage = "en"
): string {
  const primaryColor = theme?.primary || "#1e40af";
  const t = getTranslations(lang);
  const pp = t.periodPlan;

  const stepsHtml = period.steps.map(step => {
    const insertHtml = renderStepInsert(step.stepNumber, step.lessonData, lang);
    const note = period.teachingNotes.get(step.stepNumber);
    const notesHtml = note ? renderTeachingNotes(note, theme, lang) : '';

    return `
      <div class="tm-step-block">
        ${insertHtml}
        ${notesHtml}
      </div>
    `;
  }).join('\n');

  let bellRingerHtml = '';
  if (period.bellRinger) {
    const br = period.bellRinger;
    bellRingerHtml = `
      <div class="tm-bell-ringer">
        <h4 class="tm-br-title" style="color: ${primaryColor};">
          <span class="tm-br-icon">🔔</span> ${pp.bellRinger}: ${escapeHtml(br.title)}
          <span class="tm-br-duration">(${escapeHtml(br.duration)})</span>
        </h4>
        <ul class="tm-br-list">
          ${br.instructions.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
        </ul>
        ${br.gameVariations ? `
          <div class="tm-br-variations">
            <strong>${pp.gameVariations}</strong>
            <ul>
              ${br.gameVariations.map(v => `<li>${escapeHtml(v)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  let spellingHtml = '';
  if (period.spellingActivity) {
    const sp = period.spellingActivity;
    spellingHtml = `
      <div class="tm-spelling">
        <h5 class="tm-spelling-title" style="color: ${primaryColor};">✏️ ${escapeHtml(sp.title)}</h5>
        <p class="tm-spelling-instruction">${escapeHtml(sp.instructions)}</p>
      </div>
    `;
  }

  let onlineHtml = '';
  if (period.onlineComponents.length > 0) {
    onlineHtml = `
      <div class="tm-online">
        <h5 class="tm-online-title" style="color: ${primaryColor};">📱 ${pp.onlineTitle}</h5>
        <ul class="tm-online-list">
          ${period.onlineComponents.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  return `
    <div class="tm-period" data-period="${period.periodNumber}">
      <div class="tm-period-header" style="border-left: 4px solid ${primaryColor};">
        <h3 class="tm-period-title" style="color: ${primaryColor};">${pp.period} ${period.periodNumber}: ${escapeHtml(period.title)}</h3>
      </div>
      ${bellRingerHtml}
      ${stepsHtml}
      ${spellingHtml}
      ${onlineHtml}
    </div>
  `;
}
