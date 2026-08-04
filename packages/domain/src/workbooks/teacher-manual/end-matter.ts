import type { SupportedLanguage } from "./i18n/index.js";
import { getTranslations } from "./i18n/index.js";
import { escapeHtml } from "./theme.js";

/**
 * Generates the end-matter HTML blocks for a teacher's manual: self-assessment
 * guide, certificate guide, and troubleshooting sections.
 * @param _data Series metadata accepted for API symmetry; not currently
 * interpolated into the end-matter output.
 * @param theme Optional primary color for the section headers.
 * @param lang Language code for the translation bundle, defaults to English.
 * @returns The concatenated end-matter HTML sections.
 */
export function generateEndMatter(
  _data: { seriesName: string; seriesLevel: string },
  theme?: { primary: string },
  lang: SupportedLanguage = "en"
): string {
  const primaryColor = theme?.primary || "#1e40af";
  const t = getTranslations(lang);

  return `
    ${generateSelfAssessmentGuide(primaryColor, t)}
    ${generateCertificateGuide(primaryColor, t)}
    ${generateTroubleshooting(primaryColor, t)}
  `;
}

function generateSelfAssessmentGuide(
  primaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  const sa = t.endMatter.selfAssessment;
  const common = t.endMatter.common;
  return `
    <div class="tm-section tm-end-section">
      <h2 class="tm-section-header" style="color: ${primaryColor}; border-color: ${primaryColor};">${escapeHtml(sa.heading)}</h2>
      <div class="tm-end-content">
        <p>${sa.intro}</p>

        <h3 style="color: ${primaryColor};">${escapeHtml(sa.beforeHeading)}</h3>
        <ul>
          ${sa.beforeItems.map(item => `<li>${item}</li>`).join('')}
        </ul>

        <h3 style="color: ${primaryColor};">${escapeHtml(sa.duringHeading)}</h3>
        <ul>
          ${sa.duringItems.map(item => `<li>${item}</li>`).join('')}
        </ul>

        <h3 style="color: ${primaryColor};">${escapeHtml(sa.afterHeading)}</h3>
        <ul>
          ${sa.afterItems.map(item => `<li>${item}</li>`).join('')}
        </ul>

        <div class="tm-callout">
          <strong>${escapeHtml(common.tip)}:</strong> ${sa.tip}
        </div>
      </div>
    </div>
  `;
}

function generateCertificateGuide(
  primaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  const cert = t.endMatter.certificate;
  const common = t.endMatter.common;
  return `
    <div class="tm-section tm-end-section">
      <h2 class="tm-section-header" style="color: ${primaryColor}; border-color: ${primaryColor};">${escapeHtml(cert.heading)}</h2>
      <div class="tm-end-content">
        <p>${cert.intro}</p>

        <h3 style="color: ${primaryColor};">${escapeHtml(cert.presentationTips)}</h3>
        <ul>
          <li>${cert.makeItSpecial}</li>
          <li>${cert.personalize}</li>
          <li>${cert.signIt}</li>
          <li>${cert.acknowledgeEffort}</li>
          <li>${cert.photoOp}</li>
        </ul>

        <h3 style="color: ${primaryColor};">${escapeHtml(cert.whatToSayHeading)}</h3>
        <ul>
          ${cert.sayings.map(s => `<li>${s}</li>`).join('')}
        </ul>

        <div class="tm-callout">
          <strong>${escapeHtml(common.tip)}:</strong> ${cert.tip}
        </div>
      </div>
    </div>
  `;
}

function generateTroubleshooting(
  primaryColor: string,
  t: ReturnType<typeof getTranslations>
): string {
  const tr = t.endMatter.troubleshooting;
  const common = t.endMatter.common;
  return `
    <div class="tm-section tm-end-section">
      <h2 class="tm-section-header" style="color: ${primaryColor}; border-color: ${primaryColor};">${escapeHtml(tr.heading)}</h2>
      <div class="tm-end-content">

        <div class="tm-trouble-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(tr.pacingTitle)}</h3>
          <p><strong>${escapeHtml(common.problem)}:</strong> ${tr.pacingProblem}</p>
          <p><strong>${escapeHtml(common.solution)}:</strong></p>
          <ul>
            ${tr.pacingSolutions.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>

        <div class="tm-trouble-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(tr.appTitle)}</h3>
          <p><strong>${escapeHtml(common.problem)}:</strong> ${tr.appProblem}</p>
          <p><strong>${escapeHtml(common.solution)}:</strong></p>
          <ul>
            ${tr.appSolutions.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>

        <div class="tm-trouble-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(tr.writingTitle)}</h3>
          <p><strong>${escapeHtml(common.problem)}:</strong> ${tr.writingProblem}</p>
          <p><strong>${escapeHtml(common.solution)}:</strong></p>
          <ul>
            ${tr.writingSolutions.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>

        <div class="tm-trouble-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(tr.engagementTitle)}</h3>
          <p><strong>${escapeHtml(common.problem)}:</strong> ${tr.engagementProblem}</p>
          <p><strong>${escapeHtml(common.solution)}:</strong></p>
          <ul>
            ${tr.engagementSolutions.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>

        <div class="tm-trouble-block">
          <h3 style="color: ${primaryColor};">${escapeHtml(tr.aiTitle)}</h3>
          <p><strong>${escapeHtml(common.problem)}:</strong> ${tr.aiProblem}</p>
          <p><strong>${escapeHtml(common.solution)}:</strong></p>
          <ul>
            ${tr.aiSolutions.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>

      </div>
    </div>
  `;
}
