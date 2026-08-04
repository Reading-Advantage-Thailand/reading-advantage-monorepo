import type { FrontMatterData } from "./types.js";
import type { SupportedLanguage } from "./i18n/index.js";
import { getTranslations } from "./i18n/index.js";
import { escapeHtml } from "./theme.js";

/**
 * Generates the front-matter HTML blocks for a teacher's manual: title page,
 * preface, lesson plan structure, pedagogical guidelines, flashcard games
 * guide, spelling routine guide, and goal-setting introduction.
 * @param data Series metadata interpolated into the title page and preface.
 * @param theme Optional color palette; falls back to the default blue scheme.
 * @param lang Language code for the translation bundle, defaults to English.
 * @returns The concatenated front-matter HTML sections.
 */
export function generateFrontMatter(
  data: FrontMatterData,
  theme?: { primary: string; secondary: string },
  lang: SupportedLanguage = "en"
): string {
  const primaryColor = theme?.primary || "#1e40af";
  const secondaryColor = theme?.secondary || "#334155";
  const t = getTranslations(lang);

  return `
    ${generateTitlePage(data, primaryColor, secondaryColor, t)}
    ${generatePreface(data, primaryColor, t)}
    ${generateLessonPlanStructure(primaryColor, t)}
    ${generatePedagogicalGuidelines(primaryColor, t)}
    ${generateFlashcardGamesGuide(primaryColor, t)}
    ${generateSpellingRoutineGuide(primaryColor, t)}
    ${generateGoalSettingIntro(primaryColor, t)}
  `;
}

function generateTitlePage(
  data: FrontMatterData,
  primaryColor: string,
  secondaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  return `
    <div class="tm-title-page">
      <div class="tm-title-content" style="border-color: ${primaryColor};">
        <div class="tm-title-badge">${escapeHtml(t.titlePage.badge)}</div>
        <div class="tm-title-divider" style="background: ${primaryColor};"></div>
        <h1 class="tm-title-series" style="color: ${primaryColor};">${escapeHtml(data.seriesName)}</h1>
        <p class="tm-title-level">${escapeHtml(data.seriesLevel)} &bull; ${escapeHtml(data.cefrLevel)}</p>
        <p class="tm-title-subtitle" style="color: ${secondaryColor};">${escapeHtml(t.titlePage.subtitle)}</p>
        <p class="tm-title-note">${escapeHtml(t.titlePage.note)}</p>
      </div>
    </div>
  `;
}

function generatePreface(
  data: FrontMatterData,
  primaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  return `
    <div class="tm-section tm-preface">
      <h2 class="tm-section-header" style="color: ${primaryColor}; border-color: ${primaryColor};">${escapeHtml(t.preface.heading)}</h2>
      <div class="tm-preface-content">
        <p>${t.preface.welcome(data.seriesName, data.seriesLevel)}</p>
        <p>${t.preface.periodOverviewIntro}</p>
        <div class="tm-period-overview-box">
          <div class="tm-po-item"><strong>${t.preface.period1Overview}</strong></div>
          <div class="tm-po-item"><strong>${t.preface.period2Overview}</strong></div>
          <div class="tm-po-item"><strong>${t.preface.period3Overview}</strong></div>
          <div class="tm-po-item"><strong>${t.preface.period4Overview}</strong></div>
        </div>
        <h3>${escapeHtml(t.preface.howToUseHeading)}</h3>
        <ul>
          <li>${t.preface.stepInsertsDesc}</li>
          <li>${t.preface.teachingNotesDesc}</li>
          <li>${t.preface.bellRingersDesc}</li>
          <li>${t.preface.onlineComponentsDesc}</li>
        </ul>
        <h3>${escapeHtml(t.preface.blendedLearningHeading)}</h3>
        <p>${t.preface.blendedLearningIntro}</p>
        <ul>
          <li>${t.preface.workbookAnchor}</li>
          <li>${t.preface.appSupports}</li>
          <li>${t.preface.teacherAnchors}</li>
        </ul>
      </div>
    </div>
  `;
}

function generateLessonPlanStructure(
  primaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  const s = t.lessonPlanStructure;
  return `
    <div class="tm-section">
      <h2 class="tm-section-header" style="color: ${primaryColor}; border-color: ${primaryColor};">${escapeHtml(s.heading)}</h2>
      <div class="tm-structure-content">
        <p>${s.intro}</p>

        <div class="tm-period-detail">
          <h3 style="color: ${primaryColor};">${escapeHtml(s.period1Title)}</h3>
          <ul>
            <li>${s.period1Step1}</li>
            <li>${s.period1Step2}</li>
            <li>${s.period1Step3}</li>
            <li>${s.period1Step4}</li>
          </ul>
          <p class="tm-period-note">${escapeHtml(s.period1BellRinger)}</p>
          <p class="tm-period-note">${escapeHtml(s.period1Online)}</p>
        </div>

        <div class="tm-period-detail">
          <h3 style="color: ${primaryColor};">${escapeHtml(s.period2Title)}</h3>
          <ul>
            <li>${s.period2Step5}</li>
            <li>${s.period2Step6}</li>
            <li>${s.period2Step7}</li>
          </ul>
          <p class="tm-period-note">${escapeHtml(s.period2BellRinger)}</p>
          <p class="tm-period-note">${escapeHtml(s.period2Spelling)}</p>
          <p class="tm-period-note">${escapeHtml(s.period2Online)}</p>
        </div>

        <div class="tm-period-detail">
          <h3 style="color: ${primaryColor};">${escapeHtml(s.period3Title)}</h3>
          <ul>
            <li>${s.period3Step8}</li>
            <li>${s.period3Step9}</li>
            <li>${s.period3Step10}</li>
          </ul>
          <p class="tm-period-note">${escapeHtml(s.period3BellRinger)}</p>
          <p class="tm-period-note">${escapeHtml(s.period3Spelling)}</p>
          <p class="tm-period-note">${escapeHtml(s.period3Online)}</p>
        </div>

        <div class="tm-period-detail">
          <h3 style="color: ${primaryColor};">${escapeHtml(s.period4Title)}</h3>
          <ul>
            <li>${s.period4Step11}</li>
            <li>${s.period4Step12}</li>
            <li>${s.period4Step13}</li>
          </ul>
          <p class="tm-period-note">${escapeHtml(s.period4BellRinger)}</p>
          <p class="tm-period-note">${escapeHtml(s.period4Spelling)}</p>
          <p class="tm-period-note">${escapeHtml(s.period4Online)}</p>
        </div>
      </div>
    </div>
  `;
}

function generatePedagogicalGuidelines(
  primaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  const p = t.pedagogy;
  return `
    <div class="tm-section">
      <h2 class="tm-section-header" style="color: ${primaryColor}; border-color: ${primaryColor};">${escapeHtml(p.heading)}</h2>
      <div class="tm-pedagogy-content">

        <div class="tm-ped-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(p.pairWorkHeading)}</h3>
          <ul>
            ${p.pairWorkItems.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>

        <div class="tm-ped-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(p.discussionHeading)}</h3>
          <ul>
            <li>${p.thinkPairShare}</li>
            <li>${p.evidenceFirst}</li>
            <li>${p.coldCall}</li>
            <li>${p.noWrongInterest}</li>
          </ul>
        </div>

        <div class="tm-ped-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(p.appAudioHeading)}</h3>
          <ul>
            ${p.appAudioItems.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>

        <div class="tm-ped-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(p.blendedFlowHeading)}</h3>
          <ul>
            ${p.blendedFlowItems.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function generateFlashcardGamesGuide(
  primaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  const g = t.flashcardGames;
  return `
    <div class="tm-section">
      <h2 class="tm-section-header" style="color: ${primaryColor}; border-color: ${primaryColor};">${escapeHtml(g.heading)}</h2>
      <div class="tm-flashcard-content">
        <p>${g.intro}</p>

        <div class="tm-game-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(g.period1Heading)}</h3>
          <p>${g.period1Desc}</p>
        </div>

        <div class="tm-game-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(g.period24Heading)}</h3>
          <p>${g.period24Desc}</p>

          <div class="tm-game-card">
            <h4>${escapeHtml(g.memoryTitle)}</h4>
            <p>${g.memoryDesc}</p>
          </div>

          <div class="tm-game-card">
            <h4>${escapeHtml(g.goFishTitle)}</h4>
            <p>${g.goFishDesc}</p>
          </div>

          <div class="tm-game-card">
            <h4>${escapeHtml(g.snapTitle)}</h4>
            <p>${g.snapDesc}</p>
          </div>

          <div class="tm-game-card">
            <h4>${escapeHtml(g.quizShowTitle)}</h4>
            <p>${g.quizShowDesc}</p>
          </div>
        </div>

        <p class="tm-link-note">${g.moreGames}</p>
      </div>
    </div>
  `;
}

function generateSpellingRoutineGuide(
  primaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  const sp = t.spellingRoutine;
  return `
    <div class="tm-section">
      <h2 class="tm-section-header" style="color: ${primaryColor}; border-color: ${primaryColor};">${escapeHtml(sp.heading)}</h2>
      <div class="tm-spelling-content">
        <p>${sp.intro}</p>

        <div class="tm-spelling-cycle">
          <div class="tm-sp-block">
            <h3 style="color: ${primaryColor};">${escapeHtml(sp.traceTitle)}</h3>
            <p>${sp.traceDesc}</p>
          </div>

          <div class="tm-sp-block">
            <h3 style="color: ${primaryColor};">${escapeHtml(sp.writeTitle)}</h3>
            <p>${sp.writeDesc}</p>
          </div>

          <div class="tm-sp-block">
            <h3 style="color: ${primaryColor};">${escapeHtml(sp.coverWriteTitle)}</h3>
            <p>${sp.coverWriteDesc}</p>
          </div>
        </div>

        <p class="tm-spelling-note">${sp.note}</p>
      </div>
    </div>
  `;
}

function generateGoalSettingIntro(
  primaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  const g = t.goalSetting;
  return `
    <div class="tm-section">
      <h2 class="tm-section-header" style="color: ${primaryColor}; border-color: ${primaryColor};">${escapeHtml(g.heading)}</h2>
      <div class="tm-goals-content">
        <p>${g.intro}</p>

        <h3 style="color: ${primaryColor};">${escapeHtml(g.howToIntroduceHeading)}</h3>
        <ol>
          <li>${g.explainPurpose}</li>
          <li>${g.modelGoal}</li>
          <li>${g.guideGoalWriting}</li>
          <li>${g.actionPlans}</li>
          <li>${g.revisit}</li>
        </ol>

        <h3 style="color: ${primaryColor};">${escapeHtml(g.categoriesHeading)}</h3>
        <ul>
          <li>${g.reading}</li>
          <li>${g.writing}</li>
          <li>${g.vocabulary}</li>
        </ul>
      </div>
    </div>
  `;
}
