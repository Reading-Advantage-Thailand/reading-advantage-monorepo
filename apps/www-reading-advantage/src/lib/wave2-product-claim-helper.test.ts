/**
 * Wave 2 Phase 4 — Reusable product-claim test helper.
 *
 * Track:  wave2_confidence_restoration_20260628
 * Phase:  4 — Reusable Harnesses
 *
 * Drives a shared helper that audits public product claims on the marketing
 * site (www-reading-advantage), distinguishing:
 *   - app-existence claims
 *   - stale launch dates
 *   - placeholder case studies
 *   - allowed policy / disclaimer lines
 *
 * Intended home:
 *   apps/www-reading-advantage/src/testing/product-claim-helper.ts
 *
 * RED expectations at HEAD:
 *   - The helper module does not exist, so the import fails.
 *   - If a stub exists, it must classify each claim category correctly and
 *     require consent/anonymization proof for published case studies (A2).
 *
 * Anti-pattern coverage:
 *   A1: helper parses structured claim objects (kind, date, placeholders),
 *       not substring truth.
 *   A2: any claim classified as a published case study must be paired with
 *       consent/anonymization artifacts.
 *   A3: labeled counts for each claim class.
 *   A4: fails if zero claims are audited.
 *   A5: counterexample fixtures include stale dates and placeholder metrics.
 */
import { describe, expect, it } from "vitest";
import { createProductClaimHelper } from "../testing/product-claim-helper.js";

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

interface ProductClaimHelper {
  /**
   * Classify a single claim line.
   */
  classify(claim: ClaimArtifact): ClaimKind[];
  /**
   * Audit a batch of claims. For published-case-study claims, missing
   * consent/anonymization proof is reported as a violation (A2).
   */
  audit(claims: ClaimArtifact[], consentIndex?: Map<string, ConsentProof>): {
    claimCount: number;
    appExistenceCount: number;
    staleLaunchDateCount: number;
    placeholderCaseStudyCount: number;
    allowedDisclaimerCount: number;
    publishedCaseStudyCount: number;
    missingConsentCount: number;
    violations: string[];
  };
}

const CLAIM_FIXTURES: Array<{ claim: ClaimArtifact; expectedKinds: ClaimKind[] }> = [
  {
    claim: { text: "Reading Advantage is live in 50 schools.", page: "home" },
    expectedKinds: ["app-existence"],
  },
  {
    claim: { text: "Launching nationwide in Q1 2020.", page: "home" },
    expectedKinds: ["stale-launch-date"],
  },
  {
    claim: { text: "School A (Coming Soon) — +X points over Y months.", page: "case-studies" },
    expectedKinds: ["placeholder-case-study"],
  },
  {
    claim: { text: "Results may vary based on implementation fidelity.", page: "methodology" },
    expectedKinds: ["allowed-disclaimer"],
  },
];

const PUBLISHED_CASE_STUDY: ClaimArtifact = {
  text: "Baan Dek School improved reading scores by 18% in one term.",
  page: "case-studies",
};

describe("Wave 2 Phase 4 — product claim helper", () => {
  it("exists and exposes a factory function", () => {
    expect(
      createProductClaimHelper,
      "apps/www-reading-advantage/src/testing/product-claim-helper.ts must export " +
        "`createProductClaimHelper()`. This helper generalizes marketing-site " +
        "claim audits so product claims are truthful and case-study publishing " +
        "carries consent/anonymization proof.",
    ).toBeTypeOf("function");
  });

  describe("consumer — classifies each claim category (A5 counterexamples)", () => {
    it.each(CLAIM_FIXTURES)(
      "classifies: $claim.text",
      ({ claim, expectedKinds }) => {
        const helper = createProductClaimHelper() as ProductClaimHelper;
        const kinds = helper.classify(claim);
        const missing = expectedKinds.filter((k) => !kinds.includes(k));
        expect(
          missing.length,
          `Claim "$claim.text" missing expected classification count: ${missing.length}. ` +
            `Expected ${expectedKinds.join(", ")}; got ${kinds.join(", ")}.`,
        ).toBe(0);
      },
    );
  });

  it("requires consent and anonymization proof for published case studies (A2)", () => {
    const helper = createProductClaimHelper() as ProductClaimHelper;
    const report = helper.audit([PUBLISHED_CASE_STUDY]);
    expect(
      report.publishedCaseStudyCount,
      `Published case-study count: ${report.publishedCaseStudyCount}. ` +
        `The audit must recognize a concrete named school with outcomes as a ` +
        `published case study.`,
    ).toBe(1);
    expect(
      report.missingConsentCount,
      `Missing consent/anonymization proof count: ${report.missingConsentCount}. ` +
        `A published case study without consent artifacts must fail audit ` +
        `(anti-pattern A2).`,
    ).toBe(1);
    expect(report.violations.length).toBeGreaterThan(0);
  });

  it("passes a published case study that has consent + anonymization proof", () => {
    const helper = createProductClaimHelper() as ProductClaimHelper;
    const consentIndex = new Map<string, ConsentProof>([
      [
        PUBLISHED_CASE_STUDY.text,
        {
          hasConsent: true,
          consentDate: "2026-05-15",
          signatory: "School Director",
          anonymized: true,
        },
      ],
    ]);
    const report = helper.audit([PUBLISHED_CASE_STUDY], consentIndex);
    expect(
      report.missingConsentCount,
      `Missing consent/anonymization proof count: ${report.missingConsentCount}. ` +
        `A published case study with valid consent and anonymization should not ` +
        `produce a violation.`,
    ).toBe(0);
    expect(report.violations.length).toBe(0);
  });

  it("counts each claim class with labeled integers (A3 / A4)", () => {
    const helper = createProductClaimHelper() as ProductClaimHelper;
    const report = helper.audit(CLAIM_FIXTURES.map((f) => f.claim));
    expect(
      report.claimCount,
      `Audited claim count: ${report.claimCount}. ` +
        `The audit must examine at least one claim (anti-pattern A4).`,
    ).toBe(CLAIM_FIXTURES.length);
    expect(report.appExistenceCount).toBe(1);
    expect(report.staleLaunchDateCount).toBe(1);
    expect(report.placeholderCaseStudyCount).toBe(1);
    expect(report.allowedDisclaimerCount).toBe(1);
  });

  it("does not flag allowed policy/disclaimer lines as violations", () => {
    const helper = createProductClaimHelper() as ProductClaimHelper;
    const disclaimer: ClaimArtifact = {
      text: "Individual results depend on consistent classroom use.",
      page: "methodology",
    };
    const report = helper.audit([disclaimer]);
    expect(report.allowedDisclaimerCount).toBe(1);
    expect(report.violations.length).toBe(0);
  });
});
