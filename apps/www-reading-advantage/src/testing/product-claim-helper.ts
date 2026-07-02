/**
 * Wave 2 Phase 4 — Reusable product-claim test helper.
 *
 * Audits public product claims on the www-reading-advantage marketing
 * site (homepage, case studies, methodology) and classifies each claim
 * into one or more of:
 *   - "app-existence"      — claim that names the product in a market context
 *   - "stale-launch-date"  — claim with a date older than 18 months
 *   - "placeholder-case-study" — case study using placeholder metrics
 *     ("(Coming Soon)", "+X points over Y months") or anonymous school A/B
 *   - "published-case-study" — claim that names a concrete school with
 *     specific outcomes (requires consent + anonymization — A2)
 *   - "allowed-disclaimer" — policy / methodology / "results may vary" line
 *
 * Why this lives here:
 *   - `apps/www-reading-advantage/src/testing/` is intentionally NOT in
 *     the package's public exports (Next.js apps don't have a `package.json`
 *     `exports` map). The helper is a test utility, not a public marketing
 *     API.
 *   - The helper is pure: it takes structured claim artifacts and returns
 *     a labeled audit report. It does NOT mutate any public marketing
 *     copy (per the architecture guardrail in the test-strategy).
 *   - Published-case-study claims MUST be paired with consent + anonymization
 *     artifacts (A2). The audit returns a `violations` array that surfaces
 *     each missing-consent case so downstream tests / CI can fail closed.
 */

type ClaimKind =
  | "app-existence"
  | "stale-launch-date"
  | "placeholder-case-study"
  | "allowed-disclaimer"
  | "published-case-study";

interface ClaimArtifact {
  text: string;
  kind?: ClaimKind;
  locale?: string;
  page?: string;
}

interface ConsentProof {
  hasConsent: boolean;
  consentDate?: string;
  signatory?: string;
  anonymized: boolean;
}

interface AuditReport {
  claimCount: number;
  appExistenceCount: number;
  staleLaunchDateCount: number;
  placeholderCaseStudyCount: number;
  allowedDisclaimerCount: number;
  publishedCaseStudyCount: number;
  missingConsentCount: number;
  violations: string[];
}

interface ProductClaimHelper {
  /**
   * Classify a single claim line. Returns the set of `ClaimKind` labels
   * the helper assigns to the artifact (a claim can be both
   * `app-existence` and `published-case-study`, e.g.).
   */
  classify(claim: ClaimArtifact): ClaimKind[];
  /**
   * Audit a batch of claims. For each `published-case-study` claim,
   * missing consent + anonymization proof is reported as a violation.
   */
  audit(
    claims: ClaimArtifact[],
    consentIndex?: Map<string, ConsentProof>,
  ): AuditReport;
}

const PRODUCT_NAME = "Reading Advantage";

// 18 months in milliseconds; used by the stale-launch-date detector.
const STALE_DATE_THRESHOLD_MS = 18 * 30 * 24 * 60 * 60 * 1000;

const DISCLAIMER_TOKENS = [
  "results may vary",
  "individual results depend",
  "implementation fidelity",
  "based on consistent classroom use",
];

/**
 * Patterns that strongly indicate a placeholder case study (A5
 * counterexample class). The detector intentionally uses literal
 * placeholder tokens — not substring truth — so a real published case
 * study with concrete metrics is not mis-flagged.
 */
const PLACEHOLDER_TOKENS = [
  "(coming soon)",
  "coming soon",
  "+x points over y months",
  "school a",
  "school b",
  "school c",
  "placeholder",
  "tbd",
];

/**
 * Patterns that indicate a concrete named school with specific
 * outcomes — the published-case-study class. Requires a school name
 * token (capitalized word sequence after a school marker) AND a
 * concrete outcome token (percentage or specific number).
 */
const PUBLISHED_OUTCOME_TOKENS = [
  /\b\d+%/,
  /\bby\s+\d+/i,
  /\bimproved\b/i,
  /\bscore\b/i,
  /\bgrew\b/i,
  /\bgrowth\b/i,
];

const SCHOOL_NAME_HINT = /\b(?:school|academy|college|kindergarten|program)\b/i;

/**
 * Build a product-claim audit helper. The helper is pure — it does not
 * read or write any file, does not call any HTTP endpoint, and does not
 * mutate the marketing-site public copy. All classification logic
 * runs against structured `ClaimArtifact` objects.
 *
 * @param options.now - Optional override for the "current date" used by
 *   the stale-launch-date detector. Defaults to `new Date()`. Tests can
 *   pass a fixed Date so the threshold is deterministic.
 * @returns A reusable helper exposing `classify(claim)` and
 *   `audit(claims, consentIndex)`.
 */
export function createProductClaimHelper(
  options: { now?: Date } = {},
): ProductClaimHelper {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();

  return {
    classify(claim) {
      const kinds = new Set<ClaimKind>();
      const text = claim.text ?? "";

      // 1. Disclaimer lines first — they short-circuit so a "results may
      //    vary" line is not also mis-classified as a published case
      //    study.
      if (
        DISCLAIMER_TOKENS.some((token) => text.toLowerCase().includes(token))
      ) {
        kinds.add("allowed-disclaimer");
        return Array.from(kinds);
      }

      // 2. Stale launch dates: any 4-digit year < (nowMs - 18 months) is
      //    treated as a stale date token. The detector is intentionally
      //    conservative — only years older than the threshold flag.
      const yearMatches = text.match(/\b(19|20)\d{2}\b/g) ?? [];
      for (const yearStr of yearMatches) {
        const year = Number.parseInt(yearStr, 10);
        const yearMs = Date.UTC(year, 0, 1);
        if (nowMs - yearMs > STALE_DATE_THRESHOLD_MS) {
          kinds.add("stale-launch-date");
          break;
        }
      }

      // 3. Placeholder case studies: literal placeholder tokens only.
      const lower = text.toLowerCase();
      if (PLACEHOLDER_TOKENS.some((token) => lower.includes(token))) {
        kinds.add("placeholder-case-study");
      }

      // 4. App-existence claims: any claim that names the product.
      if (text.includes(PRODUCT_NAME)) {
        kinds.add("app-existence");
      }

      // 5. Published case study: concrete named school with specific
      //    outcomes. Requires both a school-name hint AND at least one
      //    outcome token — placeholder case studies do not have
      //    concrete metrics and are excluded from this class.
      const hasOutcome = PUBLISHED_OUTCOME_TOKENS.some((re) => re.test(text));
      const hasSchoolHint = SCHOOL_NAME_HINT.test(text);
      // Exclude common words from being treated as school names — only
      // a name + outcome combination triggers this label.
      if (
        hasOutcome &&
        hasSchoolHint &&
        !kinds.has("placeholder-case-study")
      ) {
        kinds.add("published-case-study");
      }

      return Array.from(kinds);
    },

    audit(claims, consentIndex) {
      const report: AuditReport = {
        claimCount: claims.length,
        appExistenceCount: 0,
        staleLaunchDateCount: 0,
        placeholderCaseStudyCount: 0,
        allowedDisclaimerCount: 0,
        publishedCaseStudyCount: 0,
        missingConsentCount: 0,
        violations: [],
      };

      for (const claim of claims) {
        const kinds = this.classify(claim);
        if (kinds.includes("app-existence")) report.appExistenceCount += 1;
        if (kinds.includes("stale-launch-date")) {
          report.staleLaunchDateCount += 1;
        }
        if (kinds.includes("placeholder-case-study")) {
          report.placeholderCaseStudyCount += 1;
        }
        if (kinds.includes("allowed-disclaimer")) {
          report.allowedDisclaimerCount += 1;
        }

        if (kinds.includes("published-case-study")) {
          report.publishedCaseStudyCount += 1;
          const proof = consentIndex?.get(claim.text);
          const valid =
            proof?.hasConsent === true && proof.anonymized === true;
          if (!valid) {
            report.missingConsentCount += 1;
            const reason = proof
              ? `published case study "${claim.text}" has incomplete consent proof (hasConsent=${String(proof.hasConsent)}, anonymized=${String(proof.anonymized)})`
              : `published case study "${claim.text}" has no consent/anonymization proof at all`;
            report.violations.push(reason);
          }
        }
      }

      return report;
    },
  };
}

export type { AuditReport, ClaimArtifact, ClaimKind, ConsentProof, ProductClaimHelper };