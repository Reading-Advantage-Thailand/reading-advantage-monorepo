# Technology Stack Overview

## Core Framework
- **Next.js 15** with App Router, TypeScript, and Turbopack for development builds.
- **React 19 (RC)** including server component support where appropriate.

## Styling & Components
- **Tailwind CSS 3.4** with `tailwindcss-animate`, `@tailwindcss/typography`, and `tailwind-merge`.
- **shadcn/ui** component primitives (Radix UI powered) for accessible, themeable UI.
- **Geist** font family and CSS variables for theming.

## Animation & Interaction
- **Framer Motion** for page transitions, component animations, and scroll-triggered effects.

## Content Processing
- **MDX** pipeline with `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, and `gray-matter`.

## Utilities
- Class composition helpers (`clsx`, `class-variance-authority`).
- Iconography via `lucide-react`.

## Tooling & Quality
- **TypeScript 5** for static typing.
- **ESLint** with Next.js + TypeScript rules.
- Planned automated tests (unit, E2E, accessibility) to be detailed in specs.

## Build & Deployment
- Next.js build pipeline (automatic code splitting, asset optimization).
- Planned GitHub Actions to deploy to Google Cloud Run.

## Future Considerations
- next-intl (or equivalent) for multilingual support.
- Testing infrastructure (component, E2E, performance).
- Expanded performance optimizations (caching, image strategy) documented in specs.
