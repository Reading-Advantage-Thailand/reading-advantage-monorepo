# Roadmap Snapshot (Legacy Migration Notes)

## High-Level Goals
- Modernize marketing experience with reusable component architecture, Framer Motion animations, and responsive layouts.
- Deliver comprehensive internationalization, authentication, and blogging capabilities.
- Establish robust DevOps (CI/CD, monitoring) and testing practices.

## Feature Themes
- **Core Platform**: Component library, global navigation, program landing pages, contact flows.
- **Authentication**: Firebase integration, protected routes, role management roadmap.
- **Blogging**: MDX content pipeline, editorial tooling, SEO enhancements.
- **Internationalization**: Multi-language routing, translation management, localization of UI/content.
- **DevOps**: Cloud Run deployments, performance monitoring, testing automation.

## Status (as of 2025-10-22)
- Core marketing experience and Firebase login flows are implemented.
- Blog infrastructure exists but lacks advanced features (pagination, tags, RSS, social, content templates).
- Internationalization, dark mode, CI/CD, testing, and SEO refinements remain outstanding.
- Detailed task breakdowns are tracked in `todo.md` pending conversion into specs and sprint issues.

## Decision Log
- Tailwind + shadcn/ui for styling (utility-first + accessible components).
- Framer Motion for meaningful animation.
- Use `--legacy-peer-deps` during npm installs and `npx shadcn@latest add <component>` for UI additions.
- Mobile-first approach with emphasis on accessibility and SEO.

Refer to `docs/project-brief.md` and `docs/prd.md` for the up-to-date narrative and requirements. This appendix serves as an archive of pre-migration notes previously stored in `cline_docs/`.
