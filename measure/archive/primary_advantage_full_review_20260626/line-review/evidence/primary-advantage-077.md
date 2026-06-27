# Line Review Evidence: primary-advantage-077

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-077
Files assigned: 1
Lines assigned: 609

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/data/title-a1.json` | 1-609 | reviewed | 4 |

## Findings

### LR-077-001 — No type/schema contract for story collection JSON

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/data/title-a1.json:1-609`
- Evidence: The file defines a `storyCollection` object with `title`, `targetAudience`, `totalStories`, and a `stories` array of `{id, genre, title, description}` objects. No TypeScript type, Zod schema, or validation exists for this shape anywhere in the `data/` directory. If the JSON structure changes (e.g., a field is renamed or removed), there is no compile-time or runtime safety net.
- Impact: Consumer code importing this JSON operates on untyped `any`. Structural drift between this file and its consumers will produce silent runtime errors rather than build failures.
- Recommendation: Add a Zod schema (e.g., `TitleA1Schema`) colocated in `apps/primary-advantage/data/` and validate at import or load time.

### LR-077-002 — Hardcoded totalStories count must be manually synced

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/data/title-a1.json:5`
- Evidence: Line 5 declares `"totalStories": 100`. The actual `stories` array (lines 6-607) contains exactly 100 entries, so the value is currently correct. However, if stories are added or removed without updating this counter, it will silently drift.
- Impact: Any consumer relying on `totalStories` for iteration bounds, pagination, or progress tracking will use a stale count.
- Recommendation: Derive the count from `stories.length` at runtime rather than maintaining a parallel static integer.

### LR-077-003 — English-only content in i18n-enabled app

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/data/title-a1.json:3-4,7-606`
- Evidence: The app uses `next-intl` for localization (confirmed in `i18n/` and `messages/` directories), but this 100-story data fixture is entirely in English — titles, descriptions, genre labels, and the collection metadata. There is no corresponding locale-keyed variant or translation key mapping.
- Impact: If Primary Advantage serves non-English locales, these stories will always render in English, creating an inconsistent experience. The `targetAudience` field ("Grades 3-6") also uses a US-centric grade system.
- Recommendation: Document this as intentional seed data that is English-only by design, or create a localization strategy for story content.

### LR-077-004 — Repeated character names across unrelated stories

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/data/title-a1.json:7-606`
- Evidence: 23 of 35 character names used in possessive story titles repeat across 2-3 unrelated stories. For example: "Emma" appears in stories #3 ("Emma's Birthday Party"), #52 ("Emma's Lost Necklace"), and #100 ("Emma's Happy Ending") — three different characters with the same name. "Ben" appears in #9, #54, #98; "Grace" in #15, #60; and so on for all 23 names.
- Impact: Primary students (grades 3-6) encountering "Emma's Birthday Party" and "Emma's Happy Ending" may assume they are the same character, creating narrative confusion when the stories are unrelated. This is a developmental consideration specific to the target age group.
- Recommendation: Either assign unique names per story, or add a character metadata field to clarify when stories share vs. differ in character identity.

## No-Finding Notes

- `apps/primary-advantage/data/title-a1.json`: Well-formed JSON with valid syntax. IDs are sequential 1-100, `totalStories` matches the array length, all 100 story objects have the required 4 fields (`id`, `genre`, `title`, `description`), and no fields are missing. Content is age-appropriate for grades 3-6. Genre taxonomy covers 35 categories with no obviously inappropriate themes.
