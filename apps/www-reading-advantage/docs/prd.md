# Product Requirements (Reading Advantage Platform)

## 1. Core Marketing Experience
- Modern landing experience highlighting Reading Advantage value propositions.
- Dedicated pages for Math, Science, STEM, Storytime, Zhongwen, CodeCamp, Tutor Advantage with consistent hero, product highlights, FAQs, and CTAs.
- Responsive design across desktop, tablet, and mobile with animation accents that enhance—not hinder—performance.

## 2. Lead Generation & Contact
- Global call-to-action pattern driving to Contact page.
- Contact form integrated with backend/email service (TBD) and basic spam controls.
- Analytics hooks (Google Analytics / Tag Manager placeholder) to measure conversions and user journeys.

## 3. Content Platform
- MDX-based blog supporting rich media, code snippets, and SEO metadata.
- Pagination, tagging, related content, and social sharing to increase dwell time.
- Editorial workflow guidance (draft/review/publish) for future CMS integration.

## 4. Authentication [DEPRECATED]
Authentication was removed in Sprint S1. The site is a static marketing experience with no user login or account functionality. Products requiring authentication are hosted on separate platforms. See docs/specs/identity/login-removal/spec.md for details.

## 5. Internationalization
- Multilingual routing with language switcher and fallback handling.
- Translation files stored per locale with tooling guidance for contributors.
- Content guidelines for localized imagery, testimonials, and regulatory messaging.

## 6. Design System & Accessibility
- Tailwind + shadcn/ui-based component library with documented usage.
- Dark mode support and theme switcher.
- WCAG 2.1 AA compliance, including keyboard navigation, ARIA labeling, and color contrast.

## 7. Performance & SEO
- Image optimization (responsive sources, lazy loading).
- Meta tags, Open Graph, structured data for all key pages and blog posts.
- Lighthouse targets: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 95, SEO ≥ 95.

## 8. Delivery & Operations
- CI/CD pipeline deploying main branch to Cloud Run or equivalent.
- Automated tests (unit/component + E2E smoke paths + accessibility checks).
- Release checklist and rollback strategy.

## Backlog Traceability
- Pending tasks currently tracked in `todo.md` must be converted into specs and issues.
- Capabilities likely required: `content/blogging`, `experience/internationalization`, `experience/theming`, `operations/ci-cd`, `quality/testing`, `marketing/seo`.

## Dependencies & Assumptions
- Access to any marketing analytics tooling.
- Design assets (logos, imagery) live in `public/` and can be expanded.
- Team has GitHub access to use workflow templates and issue automation.
- Blog authors comfortable contributing MDX until CMS decision is made.
