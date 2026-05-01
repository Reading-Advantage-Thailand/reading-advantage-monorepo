# Product Guidelines: Reading Advantage Platform

## Content & Prose Style
- **Tone:** Professional, authoritative, yet accessible and welcoming.
- **Clarity:** Use clear, direct language to communicate value propositions.
- **Formatting:** 
    - Use **Title Case** for H1 and H2 headers.
    - Use **Sentence case** for body text and calls-to-action (CTAs).

## Visual Identity & Branding
- **Base Theme:** Use a shared `sky-50` background base to unify the platform.
- **Typography:** Utilize the standard `Geist` and `GeistMono` variable fonts.
- **Product Differentiation:** Employ unique color gradients in Hero sections to distinguish between different "Advantage" programs while maintaining overall coherence.
- **Iconography:** Exclusively use the `lucide-react` library for a consistent and modern visual language.

## UI Design Principles
- **Layout:** Favor asymmetric layouts, such as 7/5 grid splits, to create a dynamic and engaging user experience.
- **Aesthetic Accents:** Use glassmorphism (`backdrop-blur-md`) and standard modern Tailwind shadows (`shadow-lg`, etc.) for depth and focus.
- **Responsiveness:** Ensure all layouts are mobile-first and fully responsive across all device sizes.

## Interaction & Performance
- **Animation Standard:** 
    - **No Framer Motion.** All animations must be implemented using `tailwindcss-animate` utility classes.
    - Focus on subtle entry animations (e.g., `fade-in`, `slide-in-from-bottom`) and intuitive hover states.
- **Accessibility:** Maintain strict adherence to WCAG 2.1 AA standards, ensuring that all interactions are accessible and do not compromise performance.
