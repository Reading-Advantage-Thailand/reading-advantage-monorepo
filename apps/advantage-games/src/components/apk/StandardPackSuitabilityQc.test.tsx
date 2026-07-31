import { fireEvent, render, screen, within } from "@testing-library/react";

import { StandardPackSuitabilityQc } from "./StandardPackSuitabilityQc";
import type { StandardPackSuitabilityQcView } from "@reading-advantage/advantage-play-kit/qc";

const authorization = {
  productionUseAuthorized: false as const,
  migrationAuthorized: false as const,
  cutoverAuthorized: false as const,
  deploymentAuthorized: false as const,
};

/** Creates a complete browser-safe suitability review view for component tests. */
function createReview(
  dossierId: string,
  disposition: "ingest-canonical" | "blocked" = "ingest-canonical",
): StandardPackSuitabilityQcView {
  const blocked = disposition === "blocked";
  const descriptor = {
    descriptorId: "legacy-hero-walk-proposed",
    catalogEntryKey: "proposed/top-down/characters/legacy-hero-walk",
    descriptorDigest: "a".repeat(64),
    release: null,
  };
  const candidates = blocked ? [] : [{
    candidateId: "legacy-hero-walk",
    origin: "legacy" as const,
    semantic: { role: "player", state: "walk", identity: "player:walk" },
    descriptor,
    comparison: {
      semanticFit: "pass" as const,
      visualReadability: "pass" as const,
      frameDirectionCompatibility: "pass" as const,
      animationBehavior: "pass" as const,
      geometry: "pass" as const,
      collisionEnvelope: "pass" as const,
      audienceAppropriateness: "pass" as const,
      localization: "not-applicable" as const,
      accessibility: "pass" as const,
      sourceReceipt: "pass" as const,
      creditObligations: "pass" as const,
    },
    requiresCanonicalIngestion: true,
    reviewerFinding: {
      candidateId: "legacy-hero-walk",
      reviewerId: "reviewer-one",
      reviewedAt: "2026-07-29T09:00:00.000Z",
      result: "ingestion-required" as const,
      summary: "Legacy evidence meets the behavior contract.",
      evidenceIds: ["visual-evidence", "technical-evidence"],
      findingDigest: "b".repeat(64),
    },
    provenance: {
      candidateId: "legacy-hero-walk",
      sourceIdentity: "legacy:fixture-title/hero-walk",
      sourceSha256: "a".repeat(64),
      sourceReceiptDigest: "b".repeat(64),
      chainOfCustody: ["legacy-source"],
    },
    license: {
      candidateId: "legacy-hero-walk",
      status: "approved" as const,
      licenseId: "LicenseRef-Fixture",
      evidenceId: "license-evidence",
      reviewedBy: "reviewer-one",
      reviewedAt: "2026-07-29T09:00:00.000Z",
      obligations: ["retain-credit"],
    },
    credit: {
      candidateId: "legacy-hero-walk",
      required: true as const,
      displayText: "Fixture credit",
      evidenceId: "credit-evidence",
    },
  }];
  return {
    dossierId,
    createdAt: "2026-07-29T09:00:00.000Z",
    requestingTitle: blocked ? "blocked-title" : "fixture-title",
    requestingCartridge: blocked ? "blocked-cartridge" : "fixture-cartridge",
    semantic: { role: "player", state: "walk", identity: "player:walk" },
    behavior: {
      mediaKind: "animation",
      requiredDirections: ["down"],
      requiredClips: ["walk"],
      minimumFramesPerClip: 6,
      minimumGeometry: { width: 192, height: 32 },
      collisionEnvelopeRequired: true,
      audienceBands: ["grades-3-5"],
      locales: ["en"],
      accessibilityNeeds: ["high-contrast-silhouette"],
    },
    candidates,
    selectedDescriptor: blocked ? null : descriptor,
    decision: {
      disposition,
      candidateId: blocked ? null : "legacy-hero-walk",
      descriptorId: blocked ? null : descriptor.descriptorId,
      nextStep: blocked ? "remain-blocked" : "canonical-ingestion-required",
      rationale: blocked
        ? "No evidence-backed candidate exists."
        : "Canonical ingestion evidence is required.",
      reviewerApprovalStatus: "accepted",
      ownerApprovalStatus: "pending",
      acceptanceStatus: "draft",
    },
    limitations: blocked ? [{
      limitationId: "no-candidate",
      candidateId: null,
      severity: "blocking",
      summary: "No suitable candidate exists.",
      evidenceIds: ["absence-evidence"],
    }] : [],
    authorization,
    acceptance: { status: "draft", manifestId: null, manifestDigest: null },
  };
}

describe("StandardPackSuitabilityQc", () => {
  it("renders a strict empty evidence boundary when no reviews are supplied", () => {
    render(<StandardPackSuitabilityQc reviews={[]} />);

    const surface = screen.getByRole("region", { name: /standard pack suitability review/i });
    expect(surface).toHaveTextContent(/evidence-only review; never production authorization/i);
    expect(surface).toHaveTextContent(/no suitability review dossiers supplied/i);
    expect(screen.queryByTestId("suitability-qc-semantic")).not.toBeInTheDocument();
  });

  it("searches and filters supplied reviews while separating evidence sections", () => {
    render(<StandardPackSuitabilityQc reviews={[
      createReview("legacy-ingestion-review"),
      createReview("blocked-review", "blocked"),
    ]} />);

    expect(screen.getByTestId("suitability-qc-semantic")).toHaveTextContent("player:walk");
    expect(screen.getByTestId("suitability-qc-physical")).toHaveTextContent(
      "proposed/top-down/characters/legacy-hero-walk",
    );
    expect(screen.getByTestId("suitability-qc-comparison")).toHaveTextContent(
      /animation behaviorpass/i,
    );
    expect(screen.getByTestId("suitability-qc-decision")).toHaveTextContent(
      "ingest-canonical",
    );
    expect(screen.getByTestId("suitability-qc-attribution")).toHaveTextContent(
      "legacy:fixture-title/hero-walk",
    );
    expect(screen.getByTestId("suitability-qc-attribution")).toHaveTextContent(
      "Fixture credit",
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: /filter suitability disposition/i }),
      { target: { value: "blocked" } },
    );
    expect(screen.getByText("1 of 2 review dossiers")).toBeInTheDocument();
    expect(screen.getByTestId("suitability-qc-physical")).toHaveTextContent(
      /no selected physical descriptor/i,
    );
    expect(screen.getByTestId("suitability-qc-decision")).toHaveTextContent(
      /no suitable candidate exists/i,
    );
  });

  it("supports semantic search, accessible selection, no-results status, and denied authority", () => {
    render(<StandardPackSuitabilityQc reviews={[
      createReview("legacy-ingestion-review"),
      createReview("blocked-review", "blocked"),
    ]} />);

    fireEvent.change(
      screen.getByRole("searchbox", { name: /search suitability reviews/i }),
      { target: { value: "blocked-cartridge" } },
    );
    const list = screen.getByRole("list", { name: /suitability review dossiers/i });
    expect(within(list).getAllByRole("button")).toHaveLength(1);
    expect(within(list).getByRole("button")).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(
      screen.getByRole("searchbox", { name: /search suitability reviews/i }),
      { target: { value: "no-match" } },
    );
    expect(screen.getByText(/no suitability review matches/i)).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", { name: /search suitability reviews/i }),
      { target: { value: "" } },
    );
    expect(screen.getByTestId("suitability-qc-decision")).toHaveTextContent(
      /production useauthorized: no/i,
    );
  });
});
