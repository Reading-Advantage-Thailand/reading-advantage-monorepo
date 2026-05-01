# Reading Advantage Project Brief

## Vision
Reading Advantage and its sister programs (Math, Science, STEM, Storytime, Zhongwen, CodeCamp, Tutor) provide turnkey curriculum and professional development solutions for bilingual and international schools across Southeast Asia. The initiative modernizes legacy static marketing sites into a unified, high-performing platform so administrators, teachers, and parents can evaluate offerings, request demos, and stay informed about program updates.

## Product Goals
- Present clear value propositions for each Advantage program with localized messaging for B2B (schools) and B2C (parents/tutors) audiences.
- Support lead generation with prominent calls-to-action, contact capture, and integration with downstream sales tooling.
- Publish thought leadership content via a flexible blogging system to establish authority in literacy and STEM education.
- Link to external platforms for any authenticated experiences; the marketing site remains static with no user accounts.
- Prepare the platform for multilingual rollout (English, Thai, Simplified Chinese) without re-architecting core components.

## Audience & Stakeholders
- **School administrators** evaluating turnkey curriculum solutions.
- **Teachers and tutors** who need professional development and classroom resources.
- **Parents** comparing after-school learning options.
- **Internal sales & success teams** who rely on analytics, form submissions, and content updates to support outreach.

## Current State (January 2025)
- Static HTML marketing site remains in the repo but the Next.js 15 implementation is now the primary experience.
- Core marketing pages, program landing pages, and hero visuals have been migrated with Tailwind + shadcn/ui styling.
- Authentication has been removed; the site is now a static marketing experience with no Firebase dependencies.
- MDX blogging infrastructure is scaffolded; advanced blogging features (pagination, tagging, RSS, analytics) are outstanding.
- Roadmap items around dark mode, CI/CD, SEO, testing, and internationalization remain open.

## Strategic Themes
- **Modern Storytelling**: Leverage animations, responsive layouts, and rich media to differentiate from legacy brochureware.
- **Scalability**: Ensure new features (blog, i18n) slot cleanly into a reusable component architecture.
- **Operational Excellence**: Adopt spec-driven workflow, CI/CD, and documentation to support distributed teams and AI collaborators.
- **Localization**: Build a content pipeline and translation framework that allows rapid expansion to new markets.

## Measures of Success
- Increase qualified lead submissions (contact form conversions) by 30% quarter-over-quarter.
- Achieve sub-2.5s Largest Contentful Paint on core marketing pages across mobile and desktop.
- Launch tri-lingual experience with >90% content coverage by Q3 2025.
- Maintain >90 Lighthouse Accessibility score for all public pages.
- Establish 100% adoption of spec-driven Git workflow for new initiatives (all work tied to specs, issues, PRs).

## Open Questions
- What CRM or marketing automation tools will consume contact form submissions?
- How will we ensure external platforms with authentication are prominently linked from the marketing site?
- How will content authors manage translations and blog publishing (CMS, MDX in repo, or hybrid)?
- Which Advantage programs require dedicated specs versus shared capabilities?

## Next Steps
1. Finalize product requirements in `docs/prd.md` and capture outstanding backlog items per capability.
2. Prioritize specs for blogging system, internationalization, and design polish.
3. Establish sprint cadence (S0 planning file) and run `seed-sprint` after specs are ready.
4. Coordinate with marketing stakeholders to validate messaging structure across locales.
