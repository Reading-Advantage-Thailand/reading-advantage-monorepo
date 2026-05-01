# Technology Stack: Reading Advantage Platform

## Core Framework & Language
- **Language:** TypeScript
- **Framework:** Next.js 15 (App Router)
- **Library:** React 18.2.0

## Styling & UI
- **CSS Framework:** Tailwind CSS
- **Component Library:** shadcn/ui (Radix UI)
- **Icons:** lucide-react
- **Animations:** tailwindcss-animate (Exclusively)

## Content & Internationalization
- **Content Management:** MDX (@next/mdx, next-mdx-remote)
- **i18n:** next-international (Multilingual routing and content)

## Infrastructure & Operations
- **Deployment:** Google Cloud Run (Active)
- **CI/CD:** GitHub Actions (Operational, triggers on merge to main)
- **Containerization:** Docker (Dockerfile and nginx.conf present)

## Utilities & Tooling
- **Transitions:** clsx, tailwind-merge
- **Metadata/Parsing:** gray-matter, marked, unified, rehype/remark
- **Package Manager:** npm
- **Development Tooling:** tsx, eslint, postcss
