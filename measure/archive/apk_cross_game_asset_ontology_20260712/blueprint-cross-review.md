# Mechanic Blueprint Cross-Review

## Review result

All 29 canonical identities have exactly one machine blueprint and one human review document. Each preserves educational input mode, correct/incorrect progression, recognizable fantasy, terminal loop, and the `GameResults` boundary while rejecting renderer and fixed-canvas assumptions.

## Evidence cohorts

| Cohort                            |         Count | Strongest evidence                                     | Disposition                                                   |
| --------------------------------- | ------------: | ------------------------------------------------------ | ------------------------------------------------------------- |
| Current raw component/logic       |            16 | Advantage Games component, logic/config, routes, tests | High-confidence rebuild behavior                              |
| Reading imported copies           | 9 overlapping | Reading component, logic, routes, tests                | Deployment and copy-parity evidence only                      |
| Withdrawn/archived implementation |            11 | Archived roadmap and catalog history                   | Mechanic retained; renderer rejected                          |
| Missing current implementation    |             2 | Astral Mage and Sorcerer's Ziggurat audits             | Medium-confidence intent; successor Red tests resolve details |
| Deleted/cancelled historical      |             2 | Abyssal Well and Babel evidence                        | Stale requirements; no route restoration implied              |

Counts overlap because imported copies also have current or historical Advantage Games evidence.

## Cross-review checks

- No blueprint changes the vocabulary/sentence distinction or host-owned persistence boundary.
- Correct actions advance one deterministic step; incorrect and out-of-order actions cannot silently advance.
- Every terminal loop requires completion-once behavior and preserves attempt/correct-answer evidence.
- Camera, renderer, CSS breakpoints, fixed portrait coordinates, client XP, and direct persistence remain redesignable.
- Gate flight, lane running, free flight, platform climbing, turn combat, typed defense, escort, stealth, territory capture, radial sequencing, matching, merging, and isometric stepping remain separate extension boundaries.

## Provisional decisions

- Astral Mage: exact spawn cadence, aim scheme, and failure budget remain for successor Red tests.
- Sorcerer's Ziggurat: exact isometric graph and invalid-step recovery remain for successor Red tests.
- Abyssal Well: cycling-word/no-answer-leak behavior survives; cancelled R3F treatment does not.
- Babel Architect: sentence construction survives provisionally; exact placement/typing and failure loop require confirmation before implementation.

No provisional row may define a shared capability by itself. Phase 3 can standardize only behavior corroborated by concrete additional consumers.
