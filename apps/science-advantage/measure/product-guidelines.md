# Science Advantage Product Guidelines

## Voice

- **Student-facing copy** should be warm, concrete, and confidence-building.
- **Teacher-facing copy** should be direct, operational, and low-noise.
- **Admin/system copy** should be precise and audit-friendly.
- Avoid inflated claims about AI, personalization, or localization that the
  product cannot yet prove in the interface.

## Learning Experience Principles

- Keep the lesson goal visible at all times.
- Make standards alignment legible without overwhelming the student.
- Prefer progression through a clear sequence over dense dashboards.
- Use interaction to reinforce comprehension, not to decorate the page.
- Treat labs, reviews, and summatives as distinct modes with distinct UI cues.

## Bilingual Content Rules

- Thai support must be intentional and content-aware.
- Do not fake Thai localization by duplicating English into Thai fields.
- Vocabulary, reading passages, image captions, and key instructions should
  define their translation requirements explicitly in the content schema.
- English remains the default instructional surface unless a track explicitly
  changes that policy.

## Teacher Experience Principles

- Put actionability ahead of data density.
- A teacher should be able to answer three questions quickly:
  - What should my class do next?
  - Who is off track?
  - Which standards or lessons are causing the problem?
- Empty, loading, and error states must still support classroom use under time
  pressure.

## Content Design Rules

- Use structured content blocks as the canonical rendering model.
- Every lesson should make room for vocabulary, direct instruction, and
  comprehension checks.
- Rich media should clarify scientific ideas, not merely decorate lessons.
- Scope-and-sequence fidelity matters more than flashy one-off lesson screens.

## UI and Accessibility

- Responsive behavior is mandatory for laptop and tablet classroom usage.
- Accessibility target is WCAG AA for contrast, keyboard flow, and semantic
  labeling.
- Data visualizations must have text equivalents or summaries.
- Avoid placeholder widgets in production-facing routes; hide incomplete
  features instead of presenting dead surfaces.
