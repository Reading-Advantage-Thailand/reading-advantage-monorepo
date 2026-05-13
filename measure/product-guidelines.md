# Product Guidelines

## Brand Voice

- **Clear and encouraging** — Students should never feel condescended to or confused.
- **Action-oriented** — Use verbs: "Solve this," "Explore the graph," "Read along."
- **Bilingual-aware** — All products serve Thai and international markets; i18n is first-class.

## UX Principles

1. **Progressive Disclosure** — Show only what the student needs for the current step. Advanced options hide behind interaction.
2. **Immediate Feedback** — Every student action produces visible, actionable feedback within 200ms.
3. **Error Resilience** — Mistakes are teaching moments, not dead ends. Never show a raw stack trace to a student.
4. **Accessibility First** — WCAG 2.1 AA minimum. All games and activities must be keyboard-navigable.
5. **Performance Budget** — First Contentful Paint < 1.5s on 4G. Next.js apps must leverage static generation where possible.

## Design System

- **Component Source:** Radix UI primitives wrapped in `@reading-advantage/ui`
- **Theming:** `next-themes` with system/default/dark modes
- **Animation:** Purposeful motion only — transitions that guide attention, not decoration
- **Icons:** Lucide React (consistent across all apps)

## Code Quality

- TypeScript strict mode enabled in all packages
- ESLint flat config shared from `packages/config`
- Prettier shared config — no per-app formatting debates
- Test coverage target: >80% for shared packages, >60% for app-specific logic

## Codecamp-Specific Guidelines

- **Zone of Proximal Development** — Exercises start simple but progressively mirror real Reading Advantage patterns (assertCan, tenant scoping, thin routers / thick domain). Never skip scaffolding steps.
- **Authentic Workflows** — Interns fork repos, create PRs, address LLM review comments, and merge. This mirrors real company practice.
- **LLM as Mentor, Not Gatekeeper** — The LLM posts PR review comments as suggestions. The intern owns their fork and decides when to merge. The review is advisory and educational, not a hard approval gate.
- **Thai-Native Learners** — Curriculum content is English (standard for code), but the chatbot responds in the intern's language. Thai is the expected default for chat interactions.
- **1+ Hour Daily** — Modules are sized for ~1 hour/day engagement over ~4 months (18 modules).
