# Line Review: sa-batch-13

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-13 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns

---

## Files Reviewed

1. `apps/science-advantage/docs/archive/competitor-analysis/8-strategic-recommendations.md`
2. `apps/science-advantage/docs/archive/competitor-analysis/appendices.md`
3. `apps/science-advantage/docs/archive/competitor-analysis/conclusion.md`
4. `apps/science-advantage/docs/archive/competitor-analysis/document-information.md`
5. `apps/science-advantage/docs/archive/competitor-analysis/executive-summary.md`
6. `apps/science-advantage/docs/archive/competitor-analysis/index.md`
7. `apps/science-advantage/docs/archive/curriculum/grade3_scope_sequence.md`
8. `apps/science-advantage/docs/archive/curriculum/grade4_scope_sequence.md`
9. `apps/science-advantage/docs/archive/curriculum/grade5_scope_sequence.md`
10. `apps/science-advantage/docs/archive/curriculum/grade6_scope_sequence.md`
11. `apps/science-advantage/docs/archive/curriculum/thai_science_standards_3_9.md`
12. `apps/science-advantage/docs/archive/curriculum/vertical_alignment_g3_6.md`
13. `apps/science-advantage/docs/archive/front-end-spec.md`
14. `apps/science-advantage/docs/archive/front-end-spec/accessibility-requirements.md`
15. `apps/science-advantage/docs/archive/front-end-spec/animation-micro-interactions.md`
16. `apps/science-advantage/docs/archive/front-end-spec/branding-style-guide.md`
17. `apps/science-advantage/docs/archive/front-end-spec/component-library-design-system.md`
18. `apps/science-advantage/docs/archive/front-end-spec/component-library-specifications.md`
19. `apps/science-advantage/docs/archive/front-end-spec/detailed-screen-specifications.md`
20. `apps/science-advantage/docs/archive/front-end-spec/index.md`

---

## Preliminary Note

All 20 files in this batch are documentation (`docs/archive/`). They are deprecated/archived documents, not application code. No files contain TypeScript, tests, route handlers, database queries, or executable logic. The review therefore focuses on: documentation correctness, consistency, stale/contradictory guidance relative to current architecture, AGENTS.md friction, broken references, and potential security hints in archived documents.

---

## File-by-File Findings

### File 1: `8-strategic-recommendations.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–94 | Business strategy document. No executable code. No security-sensitive content. | OK | — |
| 7 | Mentions "Seamless single sign-on with Reading Advantage" as an immediate priority. Current `AGENTS.md` specifies username/password-only auth via `@reading-advantage/auth`. SSO is not part of the current auth adapter. This archived recommendation contradicts the current auth philosophy. | Info | F-SA-B13-001 |
| 57 | Mentions "Comply with Thai data protection regulations" without specificity. Not actionable as code guidance. | Info | — |
| 7–13 | All "Immediate Priorities" reference ecosystem integration (SSO, cross-subject analytics, mobile apps). No mention of implementing the Drizzle-based backend or domain modules first. Reflects business planning era before technical architecture was decided. | Info | — |

**Verdict**: Archived business strategy document. The SSO reference (F-SA-B13-001) should be noted if this doc is ever resurrected.

---

### File 2: `appendices.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–26 | Short appendix listing research sources, competitor financial data, and regulatory environment. No executable content. | OK | — |
| 14 | "Data protection regulations" referenced but not detailed. No sensitive data exposed. | OK | — |

**Verdict**: Harmless archived appendix. No issues.

---

### File 3: `conclusion.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–35 | Strategic conclusion document. Proper `status: deprecated` frontmatter. No code. | OK | — |
| 1–8 | YAML frontmatter present with `type: archive`, `status: deprecated`, `tags`. Meets documentation convention. | OK | — |
| 19 | References "Reading Advantage's documented 40% improvement in outcomes" — unverifiable claim in archived doc. Not actionable. | Info | — |

**Verdict**: Properly deprecated strategic document. No actionable issues.

---

### File 4: `document-information.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–8 | Short metadata page with project name, analysis date, market focus, analyst name. | OK | — |
| 6 | Analyst name "Mary (Business Analyst)" present. Personal name in archived doc — low sensitivity. | Info | — |

**Verdict**: Clean metadata document. No issues.

---

### File 5: `executive-summary.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–25 | Executive summary. Proper `status: deprecated` frontmatter. | OK | — |
| 12 | Refers to "Reading Advantage (grades 7-12) and the upcoming Primary Advantage (grades 3-6)" — these grade ranges may differ from current product scope. Archived context. | Info | — |

**Verdict**: Properly archived. No issues.

---

### File 6: `index.md` (competitor-analysis)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–63 | Table of contents referencing 15 sibling files. | OK | — |
| 47 | **Broken section numbering**: The index labels sections 6 and 7 inconsistently. Line 47 has `[6.1 SWOT Analysis]` under a heading `[7. Market Positioning Opportunities]` — the anchor says `#61-swot-analysis-for-science-advantage` but the heading indicates section 7. The numbering drift suggests the table of contents was not updated after renumbering. | Low | F-SA-B13-002 |
| 50 | Section "7. Go-to-Market Recommendations" is referenced separately after "7. Market Positioning Opportunities" — two sections both numbered 7. Duplicate numbering. | Low | F-SA-B13-003 |

**Verdict**: Minor TOC numbering bugs indicating a section renumbering pass was incomplete. Archived doc, no runtime impact.

---

### File 7: `grade3_scope_sequence.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–1124 | Comprehensive scope-and-sequence document for Grade 3 science. No code. | OK | — |
| 1008 | "96 reading passages (pre-written, NGSS-aligned)" — references NGSS (US Next Generation Science Standards) but the project targets Thai National Standards. Line 3 says "Thai National Standards Alignment" but the content body references NGSS. | Low | F-SA-B13-004 |
| 28–51 | Assessment framework describes "AI-scored, teacher review" and "AI generates class report" — these describe an AI integration model. Current architecture requires AI access through the internal `ai` adapter. The document does not specify the adapter layer; it assumes direct AI integration. | Info | — |
| — | No executable code, no test coverage, no security concerns. | OK | — |

**Verdict**: Dense curriculum document, appropriate for archive. NGSS vs Thai standards misalignment on line 1008 is a content inaccuracy.

---

### File 8: `grade4_scope_sequence.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–1130 | Grade 4 scope and sequence. Same structure as grade 3. No code. | OK | — |
| 1130 | **Abrupt end**: The file ends at line 1130 on "Parent communication templates" — no blank line, no closing HR or EOF marker. The Grade 3 file has `---` as EOF. Missing closing separator — minor formatting inconsistency within the curriculum set. | Info | F-SA-B13-005 |
| 1008 | "96 reading passages (three difficulty levels)" — consistent with Grade 3 but uses "three difficulty levels" instead of "NGSS-aligned." More accurate phrasing. | OK | — |

**Verdict**: Clean curriculum document. Minor formatting inconsistency at EOF.

---

### File 9: `grade5_scope_sequence.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–1174 | Grade 5 scope and sequence. Same structure. No code. | OK | — |
| 1174 | EOF lacks closing separator, same as Grade 4. | Info | F-SA-B13-005 |
| 1173 | Last line is "Parent communication templates" without closing separator. Inconsistent with Grade 3 convention. | Info | — |

**Verdict**: Clean. Minor consistency gap with Grade 3 formatting convention.

---

### File 10: `grade6_scope_sequence.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–1184 | Grade 6 scope and sequence. Same structure. No code. | OK | — |
| 1184 | EOF: same as Grades 4 and 5 — no closing `---` separator. | Info | F-SA-B13-005 |
| 954 | "Curate best work from all six primary grades (if available)" — this references a portfolio across Grades 1–6, but the curriculum scope sequence documents exist only for Grades 3–6. Inconsistent with available documentation. | Info | — |

**Verdict**: Clean curriculum document. No significant issues.

---

### File 11: `thai_science_standards_3_9.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–1488 | Comprehensive Thai National Science Standards document covering Grades 3–9. No code. | OK | — |
| 749 | **Formatting break / corrupted section boundary**: Line 749 reads `digestive# Thai National Science Curriculum Standards` with a `#` character embedded mid-word. This appears to be a broken Markdown heading boundary where an H2 (`##`) was incorrectly concatenated with the preceding word. The line should likely be a section break for Grade 8 content. This is a content defect that would confuse anyone reading the raw file. | Medium | F-SA-B13-006 |
| 749–754 | Following the corruption on line 749, lines 750–754 redundantly re-declare the document title "Grades 8-9 (Mattayom 2-3) - Lower Secondary Level" and re-list "Grade 8 (Mattayom 2)" heading. This looks like a copy-paste merge error or an incomplete split during document assembly. The section from line 749 onward reads awkwardly. | Low | F-SA-B13-007 |
| — | No security, auth, or tenancy concerns. Pure curriculum reference. | OK | — |

**Verdict**: Important standards reference document but has a clear formatting/corruption defect at line 749 (F-SA-B13-006). Should be corrected if this document is relied upon.

---

### File 12: `vertical_alignment_g3_6.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–91 | Vertical alignment table showing concept progression across Grades 3–6 for all 8 strands. No code. | OK | — |
| — | Well-structured table format. Consistent with curriculum standards. | OK | — |
| — | No broken references, no security concerns. | OK | — |

**Verdict**: Clean and well-organized curriculum alignment document. No issues.

---

### File 13: `front-end-spec.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–1079 | Monolithic front-end UI/UX specification. Proper `status: deprecated` frontmatter. No executable code. | OK | — |
| 484–496 | **Color palette in this doc conflicts with `branding-style-guide.md`**: This document defines the primary color as `#2E7D32` (Green) with secondary `#1976D2` (Blue). The separate `branding-style-guide.md` (File 16) defines the primary as Rose tones (`#FDA4AF` / `#9F1239`). These are incompatible brand identities. One spec was updated and the other was not — a known risk of maintaining multiple archived spec documents. | Medium | F-SA-B13-008 |
| 20–26 | User persona "Nong" is described as "Age 12-16 / Thai secondary school student studying science in Matthayom level" — but Science Advantage's target was later refined to Grades 3–6 (Prathom). The persona describes secondary students while the scope sequence files (Files 7–10) cover Grades 3–6 (primary). | Low | F-SA-B13-009 |
| 300 | References "Seamless SSO with existing Advantage accounts" — same SSO assumption flagged in File 1. Contradicts current username/password-only auth model. | Info | F-SA-B13-001 |
| 580–585 | WCAG 2.1 AA compliance testing strategy described. Aligns with accessibility requirements. | OK | — |
| 682 | References "WebGL-based 3D rendering" for Virtual Laboratory — significant implementation scope not reflected in current backend module structure. | Info | — |
| — | The index.md (File 20) references 12+ sibling files (introduction.md, user-flows.md, etc.) that duplicate content from this monolithic file. The monolithic file is a superset. | Info | — |

**Verdict**: Comprehensive but dated monolithic spec. The color palette conflict with the branding style guide (F-SA-B13-008) is the most notable defect. Persona/grade age range mismatch (F-SA-B13-009) suggests the spec was written before grade-level scope was finalized.

---

### File 14: `accessibility-requirements.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–51 | Standalone accessibility requirements document. Proper frontmatter. | OK | — |
| — | Content is a strict subset of the monolithic `front-end-spec.md` Section 12. No new requirements. | OK | — |
| — | WCAG 2.1 AA target correctly stated. Testing strategy covers automated (axe-core), manual (NVDA, JAWS, VoiceOver, TalkBack), and Thai-specific testing. | OK | — |

**Verdict**: Clean, accurate, but entirely derivative of the monolithic spec. No issues.

---

### File 15: `animation-micro-interactions.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–26 | Short animation spec. Proper frontmatter. No code. | OK | — |
| 22–23 | Achievement celebration uses `cubic-bezier(0.68, -0.55, 0.265, 1.55)` — this easing function has a negative y-value (-0.55), which means the animation will "overshoot" before settling (a bounce-back effect). This is intentional for celebratory animations but departs from the "purposeful motion" principle stated on line 12 which says animations should be functional, not decorative. Minor philosophical tension in the spec itself. | Info | — |
| — | Content is a strict subset of the monolithic `front-end-spec.md` Section 11. | OK | — |

**Verdict**: Clean, derivative animation spec. Minor tension between bounce easing and stated motion principles, but not actionable.

---

### File 16: `branding-style-guide.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–404 | Complete branding style guide. Proper frontmatter. No code. | OK | — |
| 73–79 | **Uses Rose color palette** (`#FDA4AF` Rose 300, `#9F1239` Rose 800) — this is the palette that conflicts with the monolithic spec's Green palette. The Rose palette appears to be the later/updated one (this file is more detailed and includes design tokens). | Medium | F-SA-B13-008 |
| 330 | "Reading Advantage: Sky 400 `#38BDF8`" — confirms ecosystem differentiation with per-app brand colors. | OK | — |
| 354–357 | States implementation uses "shadcn/ui, Tailwind CSS, Radix UI" — aligns with current tech stack conventions. | OK | — |
| 362–377 | Defines design tokens (border radius, shadows) — aligns with golden-path pattern for design systems. | OK | — |
| 390–401 | Quality checklist includes accessibility, Thai font rendering, keyboard navigation. Covers important bases. | OK | — |

**Verdict**: More detailed and current-looking style guide. The Rose palette is likely the correct/canonical one. The conflict with the monolithic spec (Green palette) is the key issue.

---

### File 17: `component-library-design-system.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–110 | Component design system document. Proper frontmatter. No code. | OK | — |
| — | Content is a strict subset of the monolithic `front-end-spec.md` Section 5 (Component Library / Design System). | OK | — |
| — | No technical specifications, no code. Generic component descriptions. | OK | — |

**Verdict**: Clean derivative document. No issues.

---

### File 18: `component-library-specifications.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–111 | Technical component specifications. Proper frontmatter. No code. | OK | — |
| 18 | "WebGL-based 3D rendering with fallback to 2D canvas" — this describes the Experiment Simulator. No such component exists in the current codebase's component tree (verified by absence in scanned ui/ and features/ directories). The spec describes what would be built, not what exists. | Info | — |
| 108 | References "D3.js or Chart.js for rendering" data visualizations. Neither dependency may be present in current package.json. The spec describes aspirational technology choices. | Info | — |
| — | Content is a strict subset of the monolithic `front-end-spec.md` Section 13 (Component Library Specifications). | OK | — |

**Verdict**: Aspirational component spec describing components that may not exist yet. No defects per se, but highlights that these are forward-looking specs rather than descriptions of current implementation.

---

### File 19: `detailed-screen-specifications.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–175 | Detailed screen layout specs for Virtual Laboratory, Teacher Dashboard, Student Learning Interface, Parent Portal. Proper frontmatter. No code. | OK | — |
| — | Content is a strict subset of the monolithic `front-end-spec.md` Section 10 (Detailed Screen Specifications). | OK | — |
| 144 | **Typo**: `Summary Dashboard (flex)::` — double colon instead of single colon (`::` vs `:`). Minor formatting error. | Info | F-SA-B13-010 |
| 157–161 | Mentions "Two-factor authentication and session management" for Parent Portal. Not currently implemented in the auth adapter. Aspirational. | Info | — |

**Verdict**: Clean derivative document. Minor typo (F-SA-B13-010).

---

### File 20: `index.md` (front-end-spec)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–91 | Table of contents for the front-end-spec subdirectory. Proper frontmatter. | OK | — |
| 13 | References `./introduction.md` — this file exists on disk and is not part of this batch. | OK | — |
| 19 | References `./information-architecture-ia.md` — exists on disk. | OK | — |
| 25 | References `./user-flows.md` — exists on disk. | OK | — |
| 35 | References `./wireframes-mockups.md` — exists on disk. | OK | — |
| 59 | References `./responsiveness-strategy.md` — exists on disk. | OK | — |
| 65 | References `./performance-considerations.md` — exists on disk. | OK | — |
| 81 | References `./thai-language-support-and-cultural-considerations.md` — exists on disk. | OK | — |
| 85 | References `./testing-and-quality-assurance.md` — exists on disk. | OK | — |
| 89 | References `./next-steps.md` — exists on disk. | OK | — |
| — | All 9 referenced sibling files verified present on disk. `index.md` accurately reflects the spec document structure. | OK | — |

**Verdict**: Correct table of contents. All referenced files exist. No issues.

---

## Cross-Cutting Findings

| ID | Severity | Title | Files Affected | Description |
|----|----------|-------|----------------|-------------|
| F-SA-B13-001 | Info | SSO vs current username/password auth model | 1, 13 | Archived business docs reference "Seamless SSO" as a priority. Current `AGENTS.md` specifies username/password-only auth via `@reading-advantage/auth`. Archived docs contradict current auth philosophy — but they are archived, so this is informational only. |
| F-SA-B13-002 | Low | Broken TOC numbering | 6 | The competitor-analysis index has inconsistent section numbering (both "6." and "7." used for market positioning sections). |
| F-SA-B13-003 | Low | Duplicate section number 7 | 6 | Two sibling entries both labeled "7." in the TOC. |
| F-SA-B13-004 | Low | NGSS vs Thai standards reference | 7 | Grade 3 scope-and-sequence says "NGSS-aligned" but the document header and the rest of the curriculum set target Thai National Standards. |
| F-SA-B13-005 | Info | Inconsistent EOF formatting | 8, 9, 10 | Grades 4, 5, 6 scope-and-sequence files lack the closing `---` separator that Grade 3 has. Minor consistency gap. |
| F-SA-B13-006 | Medium | Content corruption at section boundary | 11 | Line 749 has a broken heading (`digestive# Thai National Science Curriculum Standards`) — `#` character embedded mid-word, likely a merge/copy-paste error. |
| F-SA-B13-007 | Low | Redundant re-declaration after corruption | 11 | Lines 750–754 redundantly re-declare Grade 8 section after the corruption on line 749, suggesting an incomplete document repair. |
| F-SA-B13-008 | Medium | Conflicting brand color palettes | 13, 16 | Monolithic `front-end-spec.md` uses Green (`#2E7D32`) as primary. `branding-style-guide.md` uses Rose (`#FDA4AF` / `#9F1239`). These are incompatible. The Rose palette in the style guide appears more detailed and likely canonical. |
| F-SA-B13-009 | Low | Persona/grade age range mismatch | 13 | Primary student persona targets "Age 12-16 / Matthayom" but the curriculum scope sequences cover Grades 3–6 (Prathom, ages 8–12). |
| F-SA-B13-010 | Info | Typo in screen spec | 19 | Line 144 has double colon `::` instead of single colon in a layout description. |

---

## Summary by Review Focus Area

### Correctness
- All 20 files are documentation; no executable code to evaluate for correctness.
- File 11 (thai_science_standards_3_9.md) has a content corruption at line 749 (F-SA-B13-006) that degrades the document's usability.
- Conflicting color palettes across the front-end spec files (F-SA-B13-008) mean a developer reading both docs would get contradictory branding guidance.

### Security / Tenancy / Auth
- No security-sensitive content exposed. Archived docs contain business analysis data (market research, competitor names, analyst name) but no credentials, tokens, or internal secrets.
- The SSO assumption (F-SA-B13-001) is the only auth-related finding and it is informational — the docs are archived and do not drive implementation.
- Tenancy is not applicable — no database queries or multi-tenant concerns in documentation.

### AGENTS.md Compliance
- **Documentation convention compliance**: All files with frontmatter use the `type: archive` and `status: deprecated` fields, which aligns with the `docs/` convention implied by the project structure.
- **JSDoc rule**: Not applicable — no TypeScript code in this batch.
- **Auth/Storage/AI adapter rules**: Not applicable — no code.
- **Measure/skill workflow**: The docs do not reference Measure tracks or skills. This is acceptable for archived documents.

### Test Quality
- Zero test files. Entire batch is documentation.
- Curriculum documents (Files 7–12) could serve as a reference for generating test fixtures, but no tests exist for them.

### Architecture Baseline / Golden-Path Patterns
- The branding-style-guide.md (File 16) references shadcn/ui, Tailwind CSS, and Radix UI — aligning with the golden-path.
- The front-end spec files were clearly written before the backend-as-code modular architecture was established. They reference monolithic UI concepts (WebGL laboratory, AI personalization) without awareness of the current `modules/` structure, Zod contracts, or adapter patterns.
- All 20 files are properly segregated in `docs/archive/`, which is the correct location for obsolete pre-architecture documentation.

---

## Limitations

1. **Batch scope**: All 20 files are archived documentation. No TypeScript code, no tests, no route handlers, no database schemas, no domain functions. The review is inherently limited to document quality and consistency.

2. **Derivative content**: Files 14, 15, 17, 18, 19 are strict subsets of the monolithic `front-end-spec.md` (File 13). Findings for one often apply to all; I have noted the primary location.

3. **Missing sibling files**: The `front-end-spec/index.md` references 9 sibling files not in this batch (`introduction.md`, `information-architecture-ia.md`, `user-flows.md`, `wireframes-mockups.md`, `responsiveness-strategy.md`, `performance-considerations.md`, `thai-language-support-and-cultural-considerations.md`, `testing-and-quality-assurance.md`, `next-steps.md`). These are on disk but were not requested for review.

4. **No runtime verification**: The conflicting color palettes (F-SA-B13-008) were identified by reading the documents; the actual Tailwind config and CSS custom properties may settle the question. That verification would require reviewing non-archive source files.

5. **No acceptance or closeout claims**: This report does not constitute acceptance, sign-off, or closeout of any track or work item. It is a point-in-time line review only.

---

## Final Verdict

This batch (20 files) consists entirely of archived documentation from `docs/archive/`. The files are well-organized in proper archive directories with appropriate `status: deprecated` frontmatter. Key issues found:

| Severity | Count | Key IDs |
|----------|-------|---------|
| Medium | 2 | F-SA-B13-006 (content corruption), F-SA-B13-008 (conflicting brand palettes) |
| Low | 5 | F-SA-B13-002, F-SA-B13-003, F-SA-B13-004, F-SA-B13-007, F-SA-B13-009 |
| Info | 3 | F-SA-B13-001, F-SA-B13-005, F-SA-B13-010 |

The most actionable finding is the content corruption in `thai_science_standards_3_9.md` (F-SA-B13-006) — if this document is used as a standards reference for curriculum development, the broken section boundary at line 749 should be repaired. The conflicting brand palettes (F-SA-B13-008) are a cleanup opportunity: if an archive consolidation effort occurs, the monolithic `front-end-spec.md` should be updated or annotated to reflect the Rose palette, or a note should be added that `branding-style-guide.md` supersedes the color section.

No code-level correctness, security, tenancy, or compliance issues were found because this batch contains zero executable files.
