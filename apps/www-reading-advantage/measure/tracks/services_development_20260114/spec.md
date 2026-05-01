# Spec: Complete Services and Blended Learning Page Development

## Overview
Finalize the development and design polish of the Services landing page and its child pages (Blended Learning, Managed Service). Ensure alignment with the new visual identity and performance standards.

## Requirements
- All services pages must follow the new design patterns:
    - Bold, full-width sections with organic blob decorations.
    - Specific gradient color schemes (Services: Sky/Amber, Blended: Sky/Blue, Managed: Purple/Sky).
    - Asymmetric layouts (7/5 splits) where appropriate.
    - Exclusively Lucide icons (no emojis).
    - NO Framer Motion (use tailwindcss-animate).
- Full i18n support (EN, TH, ZH) for all new/updated content.
- High performance (Lighthouse ≥ 90) and WCAG 2.1 AA accessibility.

## Design Patterns
- **Services Landing Page**: Refactor from simple grid to a more dynamic layout if needed, ensuring consistent card styling.
- **Child Pages**: Use asymmetric layouts for key feature sections.
- **Animations**: Entry transitions using `animate-in fade-in slide-in-from-bottom-8 duration-700`.
