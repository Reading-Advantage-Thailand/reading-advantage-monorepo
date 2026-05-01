# Initial Concept
Unified static marketing platform for Reading Advantage suite.

# Product Guide: Reading Advantage Platform

## Vision
The Reading Advantage Platform is a unified, high-performance static marketing experience designed to showcase the \"Advantage\" suite of curriculum solutions (Reading, Math, Science, STEM, Storytime, Zhongwen, CodeCamp, and Tutor). It serves as a modern, authoritative gateway for educational stakeholders to evaluate turnkey programs and initiate engagement.

## Target Audience
- **School Administrators:** Decision-makers evaluating curriculum and professional development solutions for bilingual and international schools.
- **Teachers and Tutors:** Educators seeking high-quality resources and professional growth opportunities.
- **Parents:** Families comparing after-school and supplementary learning options for their children.

## Primary Goals
1. **Communicate Value:** Present clear, localized value propositions for each program within the Advantage suite.
2. **Lead Generation:** Drive inquiries and demo requests through prominent calls-to-action and integrated contact capture.
3. **Establish Authority:** Provide a platform for thought leadership in literacy and STEM education.
4. **Static Excellence:** Maintain a purely static, performant experience, linking to external authenticated platforms where necessary.

## Core Features & Requirements
- **Program Landing Pages:** Dedicated, consistently branded sections for all Advantage programs.
- **Global Multilingual Support:** Comprehensive i18n implementation (English, Thai, Simplified Chinese) with strict routing and fallback handling.
- **Integrated Lead Capture:** A central contact form with spam protection and analytics integration.
- **MDX Content Pipeline:** A flexible, high-performance blogging system for editorial content.
- **Modern UI/UX:** A visually compelling experience leveraging animations and responsive layouts without sacrificing speed.

## Design & Technical Constraints
- **Framework:** Next.js 15 (App Router) with TypeScript.
- **Styling:** Tailwind CSS + shadcn/ui.
- **Performance First:** **No Framer Motion.** All animations must use `tailwindcss-animate` utility classes.
- **Strict Internationalization:** No hardcoded strings; all text must be managed via `next-international` scopes.
- **Aesthetic:** A \"sky-50\" base with product-specific gradients, glassmorphism (`backdrop-blur-md`), and modern shadows.
