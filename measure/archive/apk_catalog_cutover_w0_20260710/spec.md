# Specification: APK Catalog Cutover W0

## Overview

The APK foundation proved three Phaser-native mechanics under temporary implementation-oriented identifiers. W0 publishes those games as `dragon-flight`, `dungeon-liberator`, and `magic-defense`, removes the temporary IDs from every public loader and host surface, and proves that Advantage Games, Reading Advantage, and Primary Advantage all consume the same package cartridges. Vocabulary arrays, sentence arrays, and the five-field `GameResults` output remain unchanged.

The identity mapping is normative:

| Public game ID | Internal mechanic lineage | Learning input |
|---|---|---|
| `dragon-flight` | gate runner | vocabulary array |
| `dungeon-liberator` | sentence-order collector | sentence array |
| `magic-defense` | typing defense | vocabulary array |

Internal mechanic filenames and pure state helpers may retain descriptive names. They are not compatibility promises and must not leak into public catalog IDs, manifests, URLs, completion payloads, or host configuration.

## Stories

### Story S1: Publish product game identities
**As a** game-platform maintainer
**I want** each foundation cartridge to have a stable product-facing identity
**So that** host apps integrate named games instead of temporary mechanic demos.

**Acceptance Criteria:**
- Given the cartridge catalog, When a host enumerates it, Then the exact IDs are `dragon-flight`, `dungeon-liberator`, and `magic-defense`.
- Given a public loader, When it resolves a cartridge, Then its manifest ID matches the requested product ID.
- Given an old temporary ID, When it is supplied to public catalog lookup, Then no compatibility alias is returned.
- Given any supported cartridge, When educational input or output is validated, Then the frozen vocabulary, sentence, and five-field result ABI is unchanged.

**Estimate:** M
**Priority:** Must

### Story S2: Cut over the QC testbed
**As a** game developer or product owner
**I want** Advantage Games to launch the product-named cartridges in both editions
**So that** development and QC evidence corresponds to the identities shipped to students.

**Acceptance Criteria:**
- Given `/qc`, When the catalog loads, Then all three product IDs are selectable and no temporary public ID is shown.
- Given any product game, When Primary Chibi or Secondary Epic is selected, Then exactly one Phaser canvas runs and the result names the public game ID.
- Given desktop and 390x844 viewports, When representative keyboard and touch paths run, Then the host remains usable without horizontal overflow or leaked canvases.

**Estimate:** M
**Priority:** Must

### Story S3: Prove both production hosts
**As a** Reading or Primary application developer
**I want** one typed registry entry for every W0 game
**So that** either app can import all three games without copying source or assets.

**Acceptance Criteria:**
- Given Reading Advantage, When its APK smoke registry is exercised, Then all three product IDs load with Secondary Epic.
- Given Primary Advantage, When its APK smoke registry is exercised, Then all three product IDs load with Primary Chibi.
- Given any client result, When it crosses the host completion boundary, Then authenticated identity, tenant, awarded XP, and abuse controls remain server-owned.
- Given a package-consumption scan, When host files are inspected, Then they contain no copied cartridge implementation or app-private package import.

**Estimate:** L
**Priority:** Must

### Story S4: Lock legacy deletion evidence
**As a** monorepo maintainer
**I want** exact cutover and deletion manifests
**So that** legacy game code is removed only after callers, routes, APIs, and assets are accounted for.

**Acceptance Criteria:**
- Given each W0 public game, When its cutover record is reviewed, Then the replacement cartridge, host proofs, completion boundary, and retained internal mechanic modules are explicit.
- Given a candidate legacy path, When it still has a production caller or route, Then it is retained and assigned to a successor deletion wave.
- Given a path declared removable in W0, When graph and text scans run, Then no remaining caller requires it before deletion.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- Phaser remains pinned to stable v4 under the foundation version guard.
- Both Primary Chibi and Secondary Epic resolve the same gameplay source.
- Public loaders remain literal dynamic imports so unused cartridges stay out of host entry bundles.
- New or changed exported functions, interfaces, and types include the repository-required JSDoc.
- No game package imports Next.js, authentication, database, or app-private modules.

## Out of Scope

- Building the authenticated standalone Advantage Games arcade.
- Rebuilding additional legacy games beyond the three W0 identities.
- Preserving old public cartridge IDs or legacy renderer/source compatibility.
- Trusting client scores, XP, identity, tenant, or elapsed time as authoritative production facts.
- Replacing generated placeholder art with final commercial asset packs.
