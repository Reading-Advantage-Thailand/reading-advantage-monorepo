# Devourer Slime — Reconciled Evidence Method and Report

## Scope and freeze

This isolated T7 Batch A package covers only `sentence/devourer-slime`. Inputs were the
committed Phase-0 discovery audit and the two committed independent specialist reports.
The frozen upper revision is `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe`; the historical
revision is `1c44854682b18a2393efd265c2271f824e228a3d`. Git ancestry records the historical
revision as an ancestor of the upper revision. No worktree source, browser, mapping, or
asset evidence was inspected or authored.

## Method

1. Confirmed the identity and permissible source paths from `batch-a/discovery-audit.json`.
2. Imported only the current-source observations and historical-source observations; no
   collector, mapper, browser, or ontology prose was used as evidence.
3. Converted each observation into one atomic ledger claim, preserving its source class,
   revision, path, line envelope, cited-range hash, and blob hash.
4. Reconciled chronology by recording the ancestor relationship and keeping current and
   historical dispositions separate. Equal blob hashes are not treated as current/history
   equivalence beyond the cited envelopes.
5. Retained explicit unknowns and added negative fixtures for class promotion, browser
   claims, and test-execution claims.

## Validation report

| Check | Result |
|---|---|
| JSON parse for ledger, fixtures, and receipt | PASS |
| Exact claim count | PASS — 18 claims: 11 current, 6 historical implementation, 1 historical test artifact |
| Current/history class separation | PASS — no historical claim has current disposition |
| Current source baseline | PASS — all current claims use `a49ebcc4…` |
| Historical reachability | PASS — `1c448546…` is an ancestor of `a49ebcc4…` |
| Cited envelope fields | PASS — every claim has path, line range, range hash, blob hash, revision |
| Unsupported claims | PASS — 0 authored |
| Browser/mapping outputs | PASS — none authored |
| Negative fixtures | PASS — 3 expected rejections, all preserve unknowns |
| Diff scope | PASS — only this package's ledger, report, fixtures, and receipt are outputs |

## Budget and chronology

The imported receipts report current usage of 5 source objects / 25,516 bytes / 2
invocations / 1 minute / 11 observations, and historical usage of 6 source objects /
33,697 bytes / 17 invocations / 20 minutes / 7 observations. The historical receipt reports
the shared Phase-0 ceiling of 64 MiB, 600 objects, 300 invocations, 360 minutes, and 400
observations; all reported usage is within ceiling. This reconciliation adds no source
inspection budget and makes no provider-side isolation claim.

## Disposition

Local evidence package only. It is not browser evidence, requirements mapping, asset
forensics, ontology input, or product acceptance. Live behavior, test execution, intended
shipping status, and all behavior outside cited envelopes remain unknown.
