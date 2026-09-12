import type { LegacyWorkbookLesson } from "../legacy-workbook-importer.js";
import type { SupportedLanguage } from "./i18n/index.js";
import { getTranslations } from "./i18n/index.js";
import { STEP_TITLES } from "./types.js";
import { escapeHtml } from "./theme.js";

function renderStep1Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  return `
    <div class="si-section">
      <div class="si-title-area">
        <h4 class="si-lesson-title">${escapeHtml(lesson.lesson_title || s.untitled)}</h4>
        ${lesson.genre ? `<span class="si-meta">${escapeHtml(lesson.genre)}</span>` : ''}
      </div>
      <div class="si-stars">
        <span class="si-stars-label">${s.interestLabel}</span>
        ${[1,2,3,4,5].map(() => `<span class="si-star">☆</span>`).join('')}
      </div>
      ${lesson.article_images?.find(img => img.position === 'hero') ? `
        <div class="si-hero-image">
          <img src="${escapeHtml(lesson.article_images.find(img => img.position === 'hero')!.url)}" alt="${s.articleImage}" />
        </div>
      ` : ''}
    </div>
  `;
}

function renderStep2Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  const vocab = lesson.vocabulary || [];
  if (vocab.length === 0) return `<div class="si-section"><p class="si-empty">${s.noVocab}</p></div>`;

  return `
    <div class="si-section">
      <table class="si-vocab-table">
        <thead>
          <tr><th>${s.wordHeader}</th><th>${s.phoneticHeader}</th><th>${s.meaningHeader}</th></tr>
        </thead>
        <tbody>
          ${vocab.slice(0, 8).map(v => `
            <tr>
              <td class="si-vocab-word">${escapeHtml(v.word)}</td>
              <td class="si-vocab-phonetic">${escapeHtml(v.phonetic || '')}</td>
              <td class="si-vocab-def">${escapeHtml(v.definition || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderStep3Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  const paragraphs = lesson.article_paragraphs || [];
  const heroImg = lesson.article_images?.find(img => img.position === 'hero');

  return `
    <div class="si-section">
      ${heroImg ? `<div class="si-article-hero"><img src="${escapeHtml(heroImg.url)}" alt="${escapeHtml(heroImg.caption || '')}" /></div>` : ''}
      <div class="si-article">
        ${paragraphs.slice(0, 3).map(p => `<p class="si-para">${escapeHtml(p.text.substring(0, 150))}${p.text.length > 150 ? '...' : ''}</p>`).join('')}
        ${paragraphs.length > 3 ? `<p class="si-more">... ${s.paragraphsTotal(paragraphs.length)}</p>` : ''}
      </div>
    </div>
  `;
}

function renderStep4Insert(_lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  const boxes = 4;
  return `
    <div class="si-section">
      <p class="si-instruction">${s.writeNewWords}</p>
      <div class="si-vocab-boxes">
        ${Array.from({ length: boxes }, (_, i) => `
          <div class="si-vocab-box">
            <span class="si-box-num">${i + 1}</span>
            <div class="si-box-word">${s.word}: _______________</div>
            <div class="si-box-para">${s.paraNumber}: ___</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStep5Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  const paragraphs = lesson.article_paragraphs || [];
  return `
    <div class="si-section">
      <p class="si-instruction">${s.writeMainIdea}</p>
      <div class="si-notes-rows">
        ${paragraphs.slice(0, 5).map((p, i) => `
          <div class="si-note-row">
            <span class="si-note-para">P${i + 1}:</span>
            <span class="si-note-line">________________________________________</span>
          </div>
        `).join('')}
        ${paragraphs.length > 5 ? `<div class="si-more">... ${s.paragraphs(paragraphs.length)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderStep6Insert(_lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  return `
    <div class="si-section">
      <p class="si-instruction">${s.chooseSentences}</p>
      ${[1, 2].map(i => `
        <div class="si-sentence-box">
          <div class="si-sentence-num">${i}.</div>
          <div class="si-sentence-line">________________________________________</div>
          <div class="si-sentence-reason">
            <label>☐ ${s.grammar}</label>
            <label>☐ ${s.vocabulary}</label>
            <label>☐ ${s.usefulPhrase}</label>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderStep7Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  const questions = lesson.comprehension_questions || [];
  return `
    <div class="si-section">
      <div class="si-comp-questions">
        ${questions.slice(0, 4).map(q => `
          <div class="si-comp-q">
            <p class="si-q-text"><strong>${q.number}.</strong> ${escapeHtml(q.question)}</p>
            <div class="si-q-options">
              ${q.options.map((opt, i) => `<label class="si-option">${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</label>`).join('')}
            </div>
            <div class="si-q-clue">${s.clue}: ________________________________</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStep8Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  return `
    <div class="si-section">
      <p class="si-q-text"><strong>${s.question}:</strong> ${escapeHtml(lesson.short_answer_question || '')}</p>
      ${lesson.short_answer_hint ? `<p class="si-hint"><strong>${s.hint}:</strong> ${escapeHtml(lesson.short_answer_hint)}</p>` : ''}
      ${(lesson.sentence_starters || []).length > 0 ? `
        <div class="si-starters">
          <strong>${s.sentenceStarters}</strong>
          ${lesson.sentence_starters!.map(st => `<div class="si-starter">• ${escapeHtml(st)}</div>`).join('')}
        </div>
      ` : ''}
      <div class="si-writing-lines">
        ${[1,2,3,4].map(() => '<div class="si-write-line"></div>').join('')}
      </div>
    </div>
  `;
}

function renderStep9Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  const matches = lesson.vocab_match || [];
  const fills = lesson.vocab_fill || [];

  return `
    <div class="si-section">
      ${matches.length > 0 ? `
        <div class="si-sub-section">
          <p class="si-sub-title">${s.matchWords}</p>
          <div class="si-match-items">
            ${matches.slice(0, 4).map(m => `
              <div class="si-match-item">
                <span>${m.number}. ${escapeHtml(m.word)}</span>
                <span class="si-match-arrow">→</span>
                <span class="si-match-blank">${m.letter}. ${escapeHtml(m.definition.substring(0, 40))}${m.definition.length > 40 ? '...' : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${fills.length > 0 ? `
        <div class="si-sub-section">
          <p class="si-sub-title">${s.fillBlanks}</p>
          ${fills.slice(0, 3).map(f => `
            <div class="si-fill-item">${f.number}. ${escapeHtml(f.sentence)}</div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderStep10Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  const orderQs = lesson.sentence_order_questions || [];
  const completionPrompts = lesson.sentence_completion_prompts || [];

  return `
    <div class="si-section">
      ${orderQs.length > 0 ? `
        <div class="si-sub-section">
          <p class="si-sub-title">${s.putWordsInOrder}</p>
          ${orderQs.slice(0, 2).map((q, i) => `
            <div class="si-order-item">
              <span>${i + 1}.</span>
              <span class="si-order-words">${q.words.map(w => escapeHtml(w)).join(' / ')}</span>
              <div class="si-order-line">→ ________________________________</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${completionPrompts.length > 0 ? `
        <div class="si-sub-section">
          <p class="si-sub-title">${s.completeSentence}</p>
          ${completionPrompts.slice(0, 2).map(p => `
            <div class="si-fill-item">${p.number}. ${escapeHtml(p.prompt)} ________________</div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderStep11Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  return `
    <div class="si-section">
      <p class="si-q-text"><strong>${s.writingPrompt}:</strong> ${escapeHtml(lesson.writing_prompt || '')}</p>
      ${(lesson.writing_plan_prompts || []).length > 0 ? `
        <div class="si-plan-box">
          <strong>${s.plan}</strong>
          ${lesson.writing_plan_prompts!.map(p => `<div class="si-plan-item">• ${escapeHtml(p)}</div>`).join('')}
        </div>
      ` : ''}
      ${(lesson.writing_sentence_frames || []).length > 0 ? `
        <div class="si-frames">
          <strong>${s.sentenceFrames}</strong>
          ${lesson.writing_sentence_frames!.map(f => `<div class="si-frame">• ${escapeHtml(f)}</div>`).join('')}
        </div>
      ` : ''}
      <div class="si-writing-lines si-draft-lines">
        <div class="si-draft-label">${s.draft}</div>
        ${[1,2,3,4,5,6].map(() => '<div class="si-write-line"></div>').join('')}
      </div>
    </div>
  `;
}

function renderStep12Insert(_lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  return `
    <div class="si-section">
      <p class="si-instruction">${s.writeLanguageQuestion}</p>
      <div class="si-lq-box">
        <div class="si-lq-row">
          <span>Q:</span>
          <span class="si-lq-line">________________________________________</span>
        </div>
        <div class="si-lq-row">
          <span>A:</span>
          <span class="si-lq-line">________________________________________</span>
        </div>
      </div>
    </div>
  `;
}

function renderStep13Insert(lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]): string {
  return `
    <div class="si-section">
      ${lesson.reflection_focus ? `<p class="si-instruction">${escapeHtml(lesson.reflection_focus)}</p>` : ''}
      <div class="si-reflection">
        <div class="si-refl-row">${s.understood}: ☐ ${s.all} ☐ ${s.most} ☐ ${s.some} ☐ ${s.aLittle}</div>
        <div class="si-refl-row">${s.effortWas}: ☐ ${s.great} ☐ ${s.good} ☐ ${s.okay} ☐ ${s.needsWork}</div>
        <div class="si-refl-row">${s.wantToLearn} ________________</div>
      </div>
    </div>
  `;
}

const STEP_RENDERERS: Record<number, (lesson: LegacyWorkbookLesson, s: ReturnType<typeof getTranslations>["stepInsert"]) => string> = {
  1: renderStep1Insert,
  2: renderStep2Insert,
  3: renderStep3Insert,
  4: renderStep4Insert,
  5: renderStep5Insert,
  6: renderStep6Insert,
  7: renderStep7Insert,
  8: renderStep8Insert,
  9: renderStep9Insert,
  10: renderStep10Insert,
  11: renderStep11Insert,
  12: renderStep12Insert,
  13: renderStep13Insert,
};

/**
 * Renders the "student view" step insert for a step number: the step badge and
 * title, then the step-specific student-facing activity HTML.
 * @param stepNumber The 1-based step number (1-13) to render.
 * @param lesson The legacy lesson whose data feeds the step activity.
 * @param lang Language code for the translation bundle, defaults to English.
 * @returns The step-insert HTML block, or an empty string for unknown steps.
 */
export function renderStepInsert(
  stepNumber: number,
  lesson: LegacyWorkbookLesson,
  lang: SupportedLanguage = "en"
): string {
  const renderer = STEP_RENDERERS[stepNumber];
  if (!renderer) return '';

  const t = getTranslations(lang);
  const s = t.stepInsert;
  const stepTitle = STEP_TITLES[stepNumber] || `${s.step} ${stepNumber}`;
  const content = renderer(lesson, s);

  return `
    <div class="step-insert" data-step="${stepNumber}">
      <div class="si-header">
        <span class="si-step-badge">${s.step} ${stepNumber}</span>
        <span class="si-step-title">${escapeHtml(stepTitle)}</span>
        <span class="si-view-label">${s.studentView}</span>
      </div>
      <div class="si-content">
        ${content}
      </div>
    </div>
  `;
}
