import type { TeacherManualOptions } from "./types.js";
import { getThemeColors, escapeHtml } from "./theme.js";
import { getTranslations } from "./i18n/index.js";
import { PRINT_BRIDGE_SHIM } from "../print-bridge.js";

const PAGED_RAF_SHIM = `
<script>
(function () {
  // Paged.js paginates through a requestAnimationFrame callback chain: the
  // next frame is scheduled only from within the previous task, so a single
  // dropped rAF permanently stalls the render (few pages, idle main thread).
  // Chrome stops firing rAF for background tabs AND for visible-but-occluded
  // tabs (visibilityState stays "visible" while the compositor delivers no
  // frames), so progress must not depend on a frame being delivered. Every
  // tick is therefore armed twice: a native rAF plus a setTimeout(0) fallback.
  // Whichever fires first wins and cancels the other, so the chain always
  // advances even under frame starvation. While the page is hidden we dispatch
  // through a timer instead, and flush the queue immediately on
  // visibilitychange so a throttled hidden tab resumes at full speed as soon
  // as it is shown.
  var nativeRaf = window.requestAnimationFrame.bind(window);
  var nativeCancelRaf = window.cancelAnimationFrame.bind(window);
  var pending = [];
  var flushTimer = null;
  var armed = Object.create(null);

  function run(cb, ts) {
    try {
      cb(ts);
    } catch (e) {
      /* ignore individual callback errors */
    }
  }

  function flushPending() {
    var batch = pending;
    pending = [];
    flushTimer = null;
    for (var i = 0; i < batch.length; i++) {
      run(batch[i], performance.now());
    }
  }

  function kickHidden() {
    if (!flushTimer) {
      flushTimer = setTimeout(flushPending, 100);
    }
  }

  window.requestAnimationFrame = function (cb) {
    if (document.visibilityState === 'hidden') {
      pending.push(cb);
      kickHidden();
      return pending.length;
    }
    var done = false;
    var rafId;
    var fbTimer;
    var wrapped = function (ts) {
      if (done) {
        return;
      }
      done = true;
      if (rafId !== undefined) {
        nativeCancelRaf(rafId);
      }
      if (fbTimer !== undefined) {
        clearTimeout(fbTimer);
      }
      delete armed[rafId];
      run(cb, ts);
    };
    rafId = nativeRaf(wrapped);
    fbTimer = setTimeout(function () {
      wrapped(performance.now());
    }, 0);
    armed[rafId] = fbTimer;
    return rafId;
  };

  window.cancelAnimationFrame = function (id) {
    if (armed[id] !== undefined) {
      clearTimeout(armed[id]);
      delete armed[id];
    }
    return nativeCancelRaf(id);
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && pending.length) {
      flushPending();
    }
  });
})();
</script>
`;

function getTeacherManualStyles(primaryColor: string, secondaryColor: string): string {
  return `
    @page {
      size: 210mm 285mm;
      margin: 18mm;

      @bottom-center {
        content: "Page " counter(page);
        font-family: 'Open Sans', sans-serif;
        font-size: 9pt;
      }
    }

    @page :first {
      margin: 0;
      @bottom-center { content: none; }
    }

    body {
      background-color: #555;
      margin: 0;
      padding: 0;
      font-family: 'Open Sans', sans-serif;
    }

    .pagedjs_pages {
      display: flex;
      width: calc(var(--pagedjs-width) * 2);
      min-width: 200%;
      flex-direction: column;
      align-items: center;
      margin: 0 auto;
      padding: 20px 0;
    }

    .pagedjs_page {
      background: white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      margin-bottom: 20px;
    }

    @media print {
      body {
        background: white;
        width: 100%;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .pagedjs_pages {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        transform: none !important;
      }
      .pagedjs_page {
        margin: 0 !important;
        box-shadow: none !important;
        page-break-after: always;
      }
      .pagedjs_margin-bottom-center {
        transform: translateY(-6mm) !important;
      }
    }

    /* --- Title Page --- */
    .tm-title-page {
      height: 285mm;
      width: 210mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      break-after: page;
      box-sizing: border-box;
      margin: 0 !important;
      padding: 0 !important;
      background: linear-gradient(135deg, ${primaryColor}08, ${secondaryColor}08);
    }

    .tm-title-content {
      background: white;
      padding: 50px 70px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      max-width: 75%;
      border: 3px solid ${primaryColor};
    }

    .tm-title-badge {
      font-size: 14pt;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #666;
      margin-bottom: 15px;
    }

    .tm-title-divider {
      height: 3px;
      width: 50px;
      margin: 0 auto 20px auto;
    }

    .tm-title-series {
      font-size: 42pt;
      font-weight: 800;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 3px;
      line-height: 1.1;
    }

    .tm-title-level {
      font-size: 20pt;
      color: #4b5563;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .tm-title-subtitle {
      font-size: 16pt;
      color: ${secondaryColor};
      font-style: italic;
      margin-bottom: 10px;
    }

    .tm-title-note {
      font-size: 10pt;
      color: #888;
      line-height: 1.4;
    }

    /* --- Sections --- */
    .tm-section {
      break-after: page;
      padding-top: 30px;
    }

    .tm-section-header {
      font-size: 20pt;
      border-bottom: 2px solid;
      padding-bottom: 8px;
      margin-bottom: 20px;
    }

    /* --- Preface --- */
    .tm-preface-content {
      font-size: 11pt;
      line-height: 1.6;
    }

    .tm-preface-content p {
      margin-bottom: 12px;
    }

    .tm-preface-content h3 {
      font-size: 14pt;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    .tm-preface-content ul, .tm-preface-content ol {
      margin-bottom: 12px;
      padding-left: 20px;
    }

    .tm-preface-content li {
      margin-bottom: 6px;
    }

    .tm-period-overview-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px 20px;
      margin: 15px 0;
    }

    .tm-po-item {
      margin-bottom: 6px;
      font-size: 11pt;
    }

    /* --- Structure Content --- */
    .tm-structure-content {
      font-size: 11pt;
      line-height: 1.6;
    }

    .tm-period-detail {
      margin-bottom: 20px;
      padding: 15px;
      background: #fafafa;
      border-radius: 6px;
      border: 1px solid #eee;
    }

    .tm-period-detail h3 {
      font-size: 13pt;
      margin: 0 0 10px 0;
    }

    .tm-period-detail ul {
      margin-bottom: 8px;
      padding-left: 20px;
    }

    .tm-period-detail li {
      margin-bottom: 4px;
    }

    .tm-period-note {
      font-size: 10pt;
      color: #555;
      margin: 4px 0;
    }

    /* --- Pedagogy --- */
    .tm-pedagogy-content {
      font-size: 11pt;
      line-height: 1.6;
    }

    .tm-ped-block {
      margin-bottom: 20px;
      padding: 15px;
      background: #fafafa;
      border-radius: 6px;
      border-left: 3px solid ${primaryColor};
    }

    .tm-ped-block h3 {
      font-size: 13pt;
      margin: 0 0 10px 0;
    }

    .tm-ped-block ul {
      padding-left: 20px;
    }

    .tm-ped-block li {
      margin-bottom: 6px;
    }

    /* --- Flashcard Games --- */
    .tm-flashcard-content {
      font-size: 11pt;
      line-height: 1.6;
    }

    .tm-game-block {
      margin-bottom: 20px;
    }

    .tm-game-block h3 {
      font-size: 13pt;
      margin: 0 0 8px 0;
    }

    .tm-game-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 15px;
      margin-bottom: 10px;
    }

    .tm-game-card h4 {
      font-size: 12pt;
      margin: 0 0 6px 0;
      color: ${primaryColor};
    }

    .tm-game-card p {
      margin: 0;
      font-size: 10.5pt;
    }

    .tm-link-note {
      font-size: 10pt;
      color: #666;
      font-style: italic;
      margin-top: 15px;
    }

    /* --- Spelling --- */
    .tm-spelling-content {
      font-size: 11pt;
      line-height: 1.6;
    }

    .tm-spelling-cycle {
      display: flex;
      gap: 15px;
      margin: 15px 0;
    }

    .tm-sp-block {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 15px;
    }

    .tm-sp-block h3 {
      font-size: 12pt;
      margin: 0 0 6px 0;
    }

    .tm-sp-block p {
      margin: 0;
      font-size: 10.5pt;
    }

    .tm-spelling-note {
      font-size: 10pt;
      color: #555;
      margin-top: 15px;
    }

    /* --- Goals --- */
    .tm-goals-content {
      font-size: 11pt;
      line-height: 1.6;
    }

    .tm-goals-content h3 {
      font-size: 13pt;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    /* --- End Matter --- */
    .tm-end-section {
      break-before: page;
    }

    .tm-end-content {
      font-size: 11pt;
      line-height: 1.6;
    }

    .tm-end-content h3 {
      font-size: 13pt;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    .tm-callout {
      background: #f0f9ff;
      border-left: 3px solid ${primaryColor};
      padding: 12px 15px;
      margin: 15px 0;
      border-radius: 0 6px 6px 0;
      font-size: 10.5pt;
    }

    .tm-trouble-block {
      margin-bottom: 20px;
      padding: 15px;
      background: #fafafa;
      border-radius: 6px;
      border: 1px solid #eee;
    }

    .tm-trouble-block h3 {
      margin: 0 0 8px 0;
    }

    .tm-trouble-block p {
      margin: 4px 0;
    }

    /* --- Lesson Plan --- */
    .tm-lesson-plan {
      break-after: page;
    }

    .tm-lesson-header {
      padding: 15px 20px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 15px;
    }

    .tm-lesson-title {
      font-size: 18pt;
      margin: 0 0 8px 0;
    }

    .tm-lesson-meta {
      display: flex;
      gap: 15px;
      font-size: 10pt;
      color: #555;
      flex-wrap: wrap;
    }

    .tm-lesson-objectives {
      margin-bottom: 15px;
      padding: 10px 15px;
      background: #f8fafc;
      border-radius: 6px;
    }

    .tm-lesson-objectives h4 {
      margin: 0 0 8px 0;
      font-size: 12pt;
    }

    .tm-lesson-objectives ul {
      margin: 0;
      padding-left: 20px;
      font-size: 10.5pt;
    }

    .tm-lesson-objectives li {
      margin-bottom: 3px;
    }

    .tm-vocab-overview {
      margin-bottom: 15px;
      padding: 10px 15px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
    }

    .tm-vocab-title {
      margin: 0 0 8px 0;
      font-size: 12pt;
    }

    .tm-vocab-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 10pt;
    }

    .tm-vocab-item {
      background: white;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #fde68a;
    }

    /* --- Period --- */
    .tm-period {
      margin-bottom: 20px;
    }

    .tm-period-header {
      padding: 10px 15px;
      background: #f8fafc;
      border-radius: 0 6px 6px 0;
      margin-bottom: 12px;
    }

    .tm-period-title {
      font-size: 14pt;
      margin: 0;
    }

    /* --- Bell Ringer --- */
    .tm-bell-ringer {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 10px 15px;
      margin-bottom: 15px;
    }

    .tm-br-title {
      font-size: 11pt;
      margin: 0 0 8px 0;
    }

    .tm-br-duration {
      font-size: 10pt;
      color: #666;
      font-weight: normal;
    }

    .tm-br-list {
      margin: 0;
      padding-left: 20px;
      font-size: 10pt;
    }

    .tm-br-list li {
      margin-bottom: 3px;
    }

    .tm-br-variations {
      margin-top: 8px;
      font-size: 10pt;
    }

    .tm-br-variations ul {
      padding-left: 20px;
      margin: 4px 0 0 0;
    }

    /* --- Step Block --- */
    .tm-step-block {
      margin-bottom: 15px;
    }

    /* --- Step Insert --- */
    .step-insert {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
      background: #fafafa;
      break-inside: avoid;
    }

    .si-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: #f3f4f6;
      border-bottom: 1px solid #d1d5db;
      font-size: 10pt;
    }

    .si-step-badge {
      background: ${primaryColor};
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 9pt;
    }

    .si-step-title {
      font-weight: 600;
      color: #374151;
      flex: 1;
    }

    .si-view-label {
      font-size: 8pt;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .si-content {
      padding: 10px 12px;
      font-size: 9.5pt;
      line-height: 1.4;
    }

    .si-section {
      margin-bottom: 8px;
    }

    .si-instruction {
      font-style: italic;
      color: #555;
      margin: 0 0 6px 0;
      font-size: 9.5pt;
    }

    .si-empty {
      color: #999;
      font-style: italic;
    }

    .si-more {
      color: #888;
      font-size: 9pt;
      font-style: italic;
    }

    /* Step Insert: Vocabulary */
    .si-vocab-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }

    .si-vocab-table th {
      background: #f3f4f6;
      padding: 4px 6px;
      text-align: left;
      border: 1px solid #d1d5db;
      font-size: 8.5pt;
    }

    .si-vocab-table td {
      padding: 3px 6px;
      border: 1px solid #d1d5db;
    }

    .si-vocab-word {
      font-weight: 600;
    }

    .si-vocab-phonetic {
      color: #666;
      font-style: italic;
    }

    /* Step Insert: Article */
    .si-article-hero img {
      width: 100%;
      max-height: 60px;
      object-fit: cover;
      border-radius: 4px;
      margin-bottom: 6px;
    }

    .si-para {
      margin: 0 0 4px 0;
      font-size: 9pt;
      line-height: 1.3;
    }

    /* Step Insert: Vocab Boxes */
    .si-vocab-boxes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .si-vocab-box {
      border: 1px dashed #d1d5db;
      border-radius: 4px;
      padding: 6px;
      font-size: 8.5pt;
    }

    .si-box-num {
      font-weight: 700;
      color: ${primaryColor};
      margin-right: 4px;
    }

    .si-box-word, .si-box-para {
      color: #888;
      margin-top: 2px;
    }

    /* Step Insert: Notes Rows */
    .si-note-row {
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 9pt;
    }

    .si-note-para {
      font-weight: 700;
      color: ${primaryColor};
      white-space: nowrap;
    }

    .si-note-line {
      color: #ccc;
    }

    /* Step Insert: Sentence Collection */
    .si-sentence-box {
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 6px;
    }

    .si-sentence-num {
      font-weight: 700;
      color: ${primaryColor};
    }

    .si-sentence-line {
      color: #ccc;
      margin: 2px 0;
    }

    .si-sentence-reason {
      display: flex;
      gap: 10px;
      font-size: 8.5pt;
      color: #888;
    }

    /* Step Insert: Comprehension */
    .si-comp-q {
      margin-bottom: 8px;
    }

    .si-q-text {
      margin: 0 0 4px 0;
      font-size: 9.5pt;
    }

    .si-q-options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 9pt;
      color: #555;
      margin-bottom: 3px;
    }

    .si-q-clue {
      font-size: 8.5pt;
      color: #999;
    }

    /* Step Insert: Guided Response */
    .si-hint {
      font-size: 9pt;
      color: #555;
      margin: 0 0 6px 0;
    }

    .si-starters {
      font-size: 9pt;
      margin-bottom: 6px;
    }

    .si-starter {
      color: #555;
      margin: 2px 0 2px 10px;
    }

    .si-writing-lines .si-write-line {
      border-bottom: 1px solid #e5e7eb;
      height: 16px;
      margin-bottom: 4px;
    }

    .si-draft-label {
      font-weight: 600;
      font-size: 9pt;
      color: #555;
      margin-bottom: 4px;
    }

    .si-draft-lines .si-write-line {
      height: 14px;
    }

    /* Step Insert: Practice */
    .si-sub-section {
      margin-bottom: 8px;
    }

    .si-sub-title {
      font-weight: 600;
      font-size: 9.5pt;
      margin: 0 0 4px 0;
      color: ${primaryColor};
    }

    .si-match-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 9pt;
      margin-bottom: 3px;
    }

    .si-match-arrow {
      color: #999;
    }

    .si-match-blank {
      color: #666;
    }

    .si-fill-item, .si-order-item {
      font-size: 9pt;
      margin-bottom: 4px;
    }

    .si-order-words {
      color: #555;
      font-size: 8.5pt;
    }

    .si-order-line {
      color: #ccc;
      font-size: 8.5pt;
    }

    /* Step Insert: Writing */
    .si-plan-box, .si-frames {
      font-size: 9pt;
      margin-bottom: 6px;
    }

    .si-plan-item, .si-frame {
      color: #555;
      margin: 2px 0 2px 10px;
    }

    /* Step Insert: Language Questions */
    .si-lq-box {
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 6px 8px;
    }

    .si-lq-row {
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 9pt;
    }

    .si-lq-row span:first-child {
      font-weight: 700;
      color: ${primaryColor};
    }

    .si-lq-line {
      color: #ccc;
    }

    /* Step Insert: Reflection */
    .si-reflection {
      font-size: 9.5pt;
    }

    .si-refl-row {
      margin-bottom: 6px;
      color: #555;
    }

    /* --- Teaching Notes --- */
    .tm-teaching-notes {
      padding: 8px 12px;
      font-size: 9.5pt;
      line-height: 1.4;
    }

    .tm-note-section {
      margin-bottom: 8px;
    }

    .tm-note-title {
      font-size: 10pt;
      font-weight: 700;
      margin: 0 0 4px 0;
    }

    .tm-note-list {
      margin: 0;
      padding-left: 16px;
      font-size: 9.5pt;
    }

    .tm-note-list li {
      margin-bottom: 2px;
    }

    .tm-language-box {
      background: #f0f9ff;
      border-left: 3px solid ${primaryColor};
      padding: 6px 10px;
      border-radius: 0 4px 4px 0;
    }

    .tm-language-quote {
      margin: 2px 0;
      font-style: italic;
      color: #374151;
      font-size: 9.5pt;
    }

    .tm-watch-for {
      background: #fef3c7;
      border-left: 3px solid #f59e0b;
      padding: 6px 10px;
      border-radius: 0 4px 4px 0;
    }

    .tm-watch-title {
      color: #92400e !important;
    }

    .tm-watch-list li {
      color: #78350f;
    }

    /* --- Spelling & Online --- */
    .tm-spelling {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
    }

    .tm-spelling-title {
      font-size: 11pt;
      margin: 0 0 4px 0;
    }

    .tm-spelling-instruction {
      margin: 0;
      font-size: 10pt;
      color: #555;
    }

    .tm-online {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
    }

    .tm-online-title {
      font-size: 11pt;
      margin: 0 0 4px 0;
    }

    .tm-online-list {
      margin: 0;
      padding-left: 16px;
      font-size: 10pt;
      color: #555;
    }

    .tm-online-list li {
      margin-bottom: 3px;
    }
  `;
}

/**
 * Wraps the front matter, lesson plans, and end matter into a standalone HTML
 * teacher's manual document. The emitted document includes the Paged.js
 * polyfill preceded by the rAF resilience shim (PAGED_RAF_SHIM) so pagination
 * survives frame starvation, the print bridge listener (PRINT_BRIDGE_SHIM) so
 * the parent frame can trigger printing via postMessage, and the print-ready
 * CSS for the manual.
 * @param frontMatterHtml Rendered front-matter sections.
 * @param lessonPlansHtml Rendered lesson-plan sections.
 * @param endMatterHtml Rendered end-matter sections.
 * @param options Series metadata, theme palette, and language for the document.
 * @returns The complete HTML document for the teacher's manual.
 */
export function wrapTeacherManualDocument(
  frontMatterHtml: string,
  lessonPlansHtml: string,
  endMatterHtml: string,
  options: TeacherManualOptions
): string {
  const theme = options.theme || getThemeColors(options.seriesName, options.type);
  const styles = getTeacherManualStyles(theme.primary, theme.secondary);
  const lang = options.lang || "en";
  const isThai = lang === "th";
  const t = getTranslations(lang);
  const dw = t.documentWrapper;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(dw.titlePrefix)} - ${escapeHtml(options.seriesName)} ${escapeHtml(options.seriesLevel)}</title>
  ${PAGED_RAF_SHIM}
  ${PRINT_BRIDGE_SHIM}
  <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
  ${isThai ? '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">' : ''}
  <style>
    ${styles}
    ${isThai ? `
    body, .tm-section, .tm-title-page, .tm-lesson-plan, .tm-period,
    .step-insert, .tm-teaching-notes, .tm-bell-ringer, .tm-spelling,
    .tm-online, .tm-vocab-overview, .tm-end-section, .tm-trouble-block,
    .tm-game-card, .tm-ped-block, .si-section, .si-header, .si-content,
    .si-vocab-table, .si-notes-rows, .si-comp-questions, .si-writing-lines,
    .si-reflection, .tm-callout, .tm-note-section, .tm-language-box {
      font-family: 'Sarabun', sans-serif;
    }
    .tm-section, .tm-title-content, .tm-preface-content, .tm-structure-content,
    .tm-pedagogy-content, .tm-flashcard-content, .tm-spelling-content,
    .tm-goals-content, .tm-lesson-objectives, .tm-vocab-overview,
    .tm-bell-ringer, .tm-spelling, .tm-online, .tm-end-content,
    .tm-trouble-block, .tm-game-block, .tm-ped-block, .si-section,
    .si-vocab-table, .si-notes-rows, .si-comp-questions, .si-writing-lines,
    .si-reflection, .tm-callout, .tm-note-section, .tm-language-box {
      word-break: break-word;
    }
    ` : ''}
    @page {
      @bottom-center {
        content: "${dw.pageCounter} " counter(page);
      }
    }
  </style>
</head>
<body>
  ${frontMatterHtml}
  ${lessonPlansHtml}
  ${endMatterHtml}
</body>
</html>`;
}
