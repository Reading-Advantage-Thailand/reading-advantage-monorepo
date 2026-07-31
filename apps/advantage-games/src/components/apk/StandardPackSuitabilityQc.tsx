"use client";

import { useMemo, useState } from "react";

import type { StandardPackSuitabilityQcView } from "@reading-advantage/advantage-play-kit/qc";

/** Props for the evidence-only standard-pack suitability review surface. */
export interface StandardPackSuitabilityQcProps {
  /** Integrity-validated browser-safe review views supplied by the route owner. */
  readonly reviews: readonly StandardPackSuitabilityQcView[];
}

/**
 * Converts a camel-case comparison factor into a readable label.
 * @param factor Stable suitability comparison factor.
 * @returns A sentence-cased factor label.
 */
function formatComparisonFactor(factor: string): string {
  const spaced = factor.replace(/([A-Z])/gu, " $1").toLocaleLowerCase();
  return spaced.charAt(0).toLocaleUpperCase() + spaced.slice(1);
}

/**
 * Builds the searchable evidence text for one review view.
 * @param review Browser-safe suitability review.
 * @returns Normalized searchable title, semantic, decision, and candidate text.
 */
function suitabilityReviewSearchText(review: StandardPackSuitabilityQcView): string {
  return [
    review.dossierId,
    review.requestingTitle,
    review.requestingCartridge,
    review.semantic.role,
    review.semantic.state,
    review.semantic.identity,
    review.decision.disposition,
    review.decision.nextStep,
    ...review.candidates.flatMap((candidate) => [
      candidate.candidateId,
      candidate.origin,
      candidate.descriptor.descriptorId,
      candidate.descriptor.catalogEntryKey,
      candidate.provenance.sourceIdentity,
      candidate.license.licenseId ?? "",
      candidate.credit.displayText ?? "",
    ]),
  ].join(" ").toLocaleLowerCase();
}

/**
 * Renders searchable, evidence-only suitability dossiers without production authority.
 * @param props Integrity-validated suitability views; an empty collection is a strict no-data boundary.
 * @returns Accessible review selection and separated semantic, physical, comparison, decision, and attribution panels.
 */
export function StandardPackSuitabilityQc({ reviews }: StandardPackSuitabilityQcProps) {
  const [query, setQuery] = useState("");
  const [disposition, setDisposition] = useState<
  "all" | StandardPackSuitabilityQcView["decision"]["disposition"]
  >("all");
  const [selectedDossierId, setSelectedDossierId] = useState(
    reviews[0]?.dossierId ?? "",
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredReviews = useMemo(
    () => reviews.filter((review) => (
      (disposition === "all" || review.decision.disposition === disposition)
      && suitabilityReviewSearchText(review).includes(normalizedQuery)
    )),
    [disposition, normalizedQuery, reviews],
  );
  const selected = filteredReviews.find(
    (review) => review.dossierId === selectedDossierId,
  ) ?? filteredReviews[0] ?? null;

  return (
    <section
      aria-label="Standard pack suitability review"
      className="border-t border-[#335c4b] bg-[#0a1713] px-4 py-8 text-[#f4f0dc] sm:px-8"
      data-testid="standard-pack-suitability-qc"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">
              Suitability dossiers
            </p>
            <h2 className="mt-1 font-serif text-3xl font-bold">
              Standard Pack suitability review
            </h2>
          </div>
          <p
            className="max-w-xl rounded border border-[#4f806a] bg-[#102820] px-3 py-2 text-xs text-[#b9f6d5]"
            data-testid="suitability-qc-scope-note"
          >
            Evidence-only review; never production authorization, title migration,
            cutover, deployment, resolver output, or media publication.
          </p>
        </div>

        {reviews.length === 0 ? (
          <p
            className="mt-6 rounded border border-[#6d5b32] bg-[#2b2414] p-4 text-sm text-[#f3d690]"
            role="status"
          >
            No suitability review dossiers supplied. The runtime QC surface remains
            empty and makes no suitability claim.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
              <label className="text-sm font-medium" htmlFor="suitability-qc-search">
                Search suitability reviews
                <input
                  className="mt-2 min-h-11 w-full rounded border border-[#426b59] bg-[#07110e] px-3 text-[#f4f0dc] outline-none focus:ring-2 focus:ring-[#8ce0b8]"
                  id="suitability-qc-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="title, cartridge, role, disposition, descriptor…"
                  type="search"
                  value={query}
                />
              </label>
              <label className="text-sm font-medium" htmlFor="suitability-qc-disposition">
                Filter suitability disposition
                <select
                  className="mt-2 min-h-11 w-full rounded border border-[#426b59] bg-[#07110e] px-3 text-[#f4f0dc]"
                  id="suitability-qc-disposition"
                  onChange={(event) => setDisposition(
                    event.target.value as typeof disposition,
                  )}
                  value={disposition}
                >
                  <option value="all">All dispositions</option>
                  <option value="reuse-canonical">Reuse canonical</option>
                  <option value="ingest-canonical">Ingest canonical</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>
            </div>

            <p aria-live="polite" className="mt-3 text-sm text-[#b9c9bf]">
              {filteredReviews.length} of {reviews.length} review dossiers
            </p>

            <div className="mt-4 grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
              <div>
                <ul
                  aria-label="Suitability review dossiers"
                  className="space-y-2"
                >
                  {filteredReviews.map((review) => (
                    <li key={review.dossierId}>
                      <button
                        aria-pressed={selected?.dossierId === review.dossierId}
                        className="min-h-11 w-full rounded border border-[#426b59] bg-[#07110e] p-3 text-left hover:border-[#8ce0b8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c969] aria-pressed:border-[#f3c969]"
                        onClick={() => setSelectedDossierId(review.dossierId)}
                        type="button"
                      >
                        <span className="block break-all font-mono text-xs text-[#b9f6d5]">
                          {review.dossierId}
                        </span>
                        <span className="mt-1 block text-xs text-[#8fa99b]">
                          {review.requestingTitle} · {review.semantic.identity} ·{" "}
                          {review.decision.disposition}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {filteredReviews.length === 0 ? (
                  <p
                    className="rounded border border-[#6d5b32] bg-[#2b2414] p-4 text-sm text-[#f3d690]"
                    role="status"
                  >
                    No suitability review matches the current search and disposition.
                  </p>
                ) : null}
              </div>

              {selected ? (
                <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                  <article
                    className="rounded border border-[#29483c] bg-[#07110e] p-4"
                    data-testid="suitability-qc-semantic"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#f3c969]">
                      Semantic intent
                    </h3>
                    <p className="mt-3 font-mono text-sm text-[#b9f6d5]">
                      {selected.semantic.identity}
                    </p>
                    <dl className="mt-3 space-y-2 text-xs">
                      <div><dt className="text-[#8fa99b]">Title</dt><dd>{selected.requestingTitle}</dd></div>
                      <div><dt className="text-[#8fa99b]">Cartridge</dt><dd>{selected.requestingCartridge}</dd></div>
                      <div><dt className="text-[#8fa99b]">Media</dt><dd>{selected.behavior.mediaKind}</dd></div>
                      <div><dt className="text-[#8fa99b]">Required clips</dt><dd>{selected.behavior.requiredClips.join(", ") || "none"}</dd></div>
                    </dl>
                  </article>

                  <article
                    className="min-w-0 rounded border border-[#29483c] bg-[#07110e] p-4"
                    data-testid="suitability-qc-physical"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#f3c969]">
                      Physical descriptor
                    </h3>
                    {selected.selectedDescriptor ? (
                      <dl className="mt-3 space-y-2 text-xs">
                        <div><dt className="text-[#8fa99b]">Descriptor</dt><dd className="break-all font-mono">{selected.selectedDescriptor.descriptorId}</dd></div>
                        <div><dt className="text-[#8fa99b]">Catalog key</dt><dd className="break-all font-mono">{selected.selectedDescriptor.catalogEntryKey}</dd></div>
                        <div><dt className="text-[#8fa99b]">Release</dt><dd>{selected.selectedDescriptor.release?.version ?? "proposed; not released"}</dd></div>
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm text-[#b9c9bf]">
                        No selected physical descriptor. This dossier remains blocked.
                      </p>
                    )}
                  </article>

                  <article
                    className="min-w-0 rounded border border-[#29483c] bg-[#07110e] p-4 lg:col-span-2"
                    data-testid="suitability-qc-comparison"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#f3c969]">
                      Visual and technical comparison
                    </h3>
                    {selected.candidates.length > 0 ? selected.candidates.map((candidate) => (
                      <div className="mt-4 border-l-2 border-[#426b59] pl-4" key={candidate.candidateId}>
                        <p className="break-all font-mono text-xs text-[#b9f6d5]">
                          {candidate.candidateId} · {candidate.reviewerFinding.result}
                        </p>
                        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                          {Object.entries(candidate.comparison).map(([factor, result]) => (
                            <div className="rounded bg-[#102820] p-2" key={factor}>
                              <dt className="text-[#8fa99b]">{formatComparisonFactor(factor)}</dt>
                              <dd className={result === "fail" ? "font-bold text-[#ff9f8e]" : "text-[#b9f6d5]"}>{result}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )) : (
                      <p className="mt-3 text-sm text-[#b9c9bf]">
                        No candidate comparison is present for this evidence-backed absence.
                      </p>
                    )}
                  </article>

                  <article
                    className="rounded border border-[#29483c] bg-[#07110e] p-4"
                    data-testid="suitability-qc-decision"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#f3c969]">
                      Decision and limitations
                    </h3>
                    <p className="mt-3 font-mono text-sm text-[#b9f6d5]">
                      {selected.decision.disposition}
                    </p>
                    <p className="mt-2 text-xs">{selected.decision.rationale}</p>
                    <dl className="mt-3 space-y-2 text-xs">
                      <div><dt className="text-[#8fa99b]">Acceptance</dt><dd>{selected.decision.acceptanceStatus}</dd></div>
                      <div><dt className="text-[#8fa99b]">Production use</dt><dd>Authorized: no</dd></div>
                      <div><dt className="text-[#8fa99b]">Migration</dt><dd>Authorized: no</dd></div>
                      <div><dt className="text-[#8fa99b]">Cutover</dt><dd>Authorized: no</dd></div>
                      <div><dt className="text-[#8fa99b]">Deployment</dt><dd>Authorized: no</dd></div>
                    </dl>
                    {selected.limitations.map((limitation) => (
                      <p className="mt-3 rounded border border-[#6d5b32] p-2 text-xs" key={limitation.limitationId}>
                        {limitation.severity}: {limitation.summary}
                      </p>
                    ))}
                  </article>

                  <article
                    className="min-w-0 rounded border border-[#29483c] bg-[#07110e] p-4"
                    data-testid="suitability-qc-attribution"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#f3c969]">
                      Provenance and attribution
                    </h3>
                    {selected.candidates.length > 0 ? selected.candidates.map((candidate) => (
                      <dl className="mt-3 space-y-2 text-xs" key={candidate.candidateId}>
                        <div><dt className="text-[#8fa99b]">Source</dt><dd className="break-all font-mono">{candidate.provenance.sourceIdentity}</dd></div>
                        <div><dt className="text-[#8fa99b]">License</dt><dd>{candidate.license.status} · {candidate.license.licenseId ?? "unassigned"}</dd></div>
                        <div><dt className="text-[#8fa99b]">Credit</dt><dd>{candidate.credit.displayText ?? "evidence-backed waiver"}</dd></div>
                        <div><dt className="text-[#8fa99b]">Source receipt</dt><dd className="break-all font-mono">{candidate.provenance.sourceReceiptDigest}</dd></div>
                      </dl>
                    )) : (
                      <p className="mt-3 text-sm text-[#b9c9bf]">
                        No candidate provenance or attribution records are present.
                      </p>
                    )}
                  </article>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
