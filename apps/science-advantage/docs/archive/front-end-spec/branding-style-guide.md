---
title: Science Advantage Web App — UX/UI Style Guide
type: archive
status: deprecated
created_at: 2025-11-29
tags: [front-end, ui/ux, style-guide, archive]
---

# Science Advantage Web App — UX/UI Style Guide

**Version:** 1.0
**Last Updated:** October 2025
**Purpose:**
This document defines the UX and UI design language for Science Advantage, part of the Advantage ecosystem of educational apps. It ensures visual and functional consistency across the platform while maintaining brand coherence with Reading Advantage and future Advantage applications.

---

## 1. Overview

Science Advantage employs a **clean, minimalist, education-focused design language** with science-specific elements. The interface is structured, intuitive, and emphasizes clarity for complex scientific concepts. The design supports multilingual use (English/Thai) and incorporates gamified learning elements such as XP, achievements, and leaderboards.

**Design Philosophy:** Consistent with the Advantage ecosystem while incorporating science education themes through color-coded subjects, interactive experiments, and visual scientific notation.

---

## 2. Design Principles

1. **Clarity:** Every UI element serves a clear function. Whitespace and alignment promote understanding of complex scientific concepts.
2. **Consistency:** Components follow a predictable structure across the Advantage ecosystem—buttons, cards, and progress indicators share uniform styling.
3. **Accessibility:** High color contrast and simple typography improve legibility for technical content and formulas.
4. **Responsiveness:** The layout adapts cleanly from desktop to tablet without loss of visual hierarchy.
5. **Motivation through Gamification:** Leaderboards, XP indicators, achievements, and progress tracking encourage engagement.
6. **Scientific Precision:** Support for formulas, diagrams, and experiment controls with clear visual hierarchy.

---

## 3. Layout

### 3.1 Structure

- **Grid-Based Layout:** Light grid pattern background to support visual alignment and scientific diagram clarity.
- **Two-Column System:**
  - **Left Sidebar:** Navigation (icons + labels) with science subject indicators.
  - **Main Content Area:** Card-based layout for dashboard components, experiments, and lessons.
- **Top Navigation Bar:**
  - Displays app logo (Rose colors), XP, and profile settings.
  - Light-gray background with subtle separators.

### 3.2 Spacing

- Standard gutter: **16px**
- Section padding: **24px**
- Card internal padding: **20px**
- Component spacing: **16px** between related elements
- Major section separation: **24px**
- Grid System: **8dp baseline** with **4dp subdivisions** for precision alignment

### 3.3 Spacing Scale

- **XS:** 4px - Fine details and tight spacing
- **SM:** 8px - Element separation and padding
- **MD:** 16px - Component spacing and section breaks
- **LG:** 24px - Major section separation
- **XL:** 32px - Page layout and large components
- **XXL:** 48px - Major layout divisions

---

## 4. Color Palette

### 4.1 Brand Colors (Science Advantage)

| Purpose              | Color      | Hex       | Notes                                |
| -------------------- | ---------- | --------- | ------------------------------------ |
| Primary Brand Light  | Rose 300   | `#FDA4AF` | Logo, light mode accents, highlights |
| Primary Brand Dark   | Rose 800   | `#9F1239` | Logo, primary actions, navigation    |
| Primary Background   | White      | `#FFFFFF` | Main background for clarity          |
| Secondary Background | Light Gray | `#F8F9FB` | Panels and cards                     |

### 4.2 Functional Colors

| Purpose        | Color     | Hex                   | Usage                                                     |
| -------------- | --------- | --------------------- | --------------------------------------------------------- |
| Accent Primary | Rose 600  | `#E11D48`             | Active states, primary CTAs, selected items               |
| Success Green  | Green 500 | `#22C55E`             | Correct answers, completed experiments, positive feedback |
| Warning Orange | Amber 500 | `#F59E0B`             | Safety warnings, in-progress states, cautions             |
| Error Red      | Red 500   | `#EF4444`             | Errors, incorrect procedures, destructive actions         |
| Info Blue      | Blue 500  | `#3B82F6`             | Information, cross-references, secondary links            |
| Neutral Gray   | Gray 500  | `#6B7280`             | Text, borders, inactive elements                          |
| Action Black   | Gray 900  | `#111827`             | Primary button backgrounds, headings                      |
| Soft Shadow    | —         | `rgba(0, 0, 0, 0.05)` | Card elevation and depth                                  |

### 4.3 Science Subject Colors

| Subject       | Color      | Hex       | Usage                                         |
| ------------- | ---------- | --------- | --------------------------------------------- |
| Physics       | Purple 600 | `#9333EA` | Physics experiments, mechanics, energy        |
| Chemistry     | Orange 600 | `#EA580C` | Chemistry experiments, reactions, materials   |
| Biology       | Green 600  | `#16A34A` | Biology experiments, life sciences, ecology   |
| Earth Science | Brown 600  | `#92400E` | Earth science, geology, environmental science |

**Usage Guidelines:**

- Use subject colors for lesson cards, experiment headers, and content categorization
- Maintain accessibility by using darker shades for text on light backgrounds
- Combine subject colors with neutral grays for balanced interfaces

---

## 5. Typography

### 5.1 Font Families

- **Primary:** Inter or Roboto - Clean, modern sans-serif for UI elements
- **Thai Support:** Sarabun - Google Fonts optimized for Thai language readability
- **Monospace:** JetBrains Mono - Code, formulas, chemical equations, and technical notation

### 5.2 Type Scale

| Element          | Font           | Weight | Size | Line Height | Color     |
| ---------------- | -------------- | ------ | ---- | ----------- | --------- |
| H1 Headings      | Inter/Sarabun  | 600    | 24px | 1.2         | `#111827` |
| H2 Headings      | Inter/Sarabun  | 600    | 20px | 1.3         | `#111827` |
| H3 Headings      | Inter/Sarabun  | 600    | 18px | 1.4         | `#1F2937` |
| Body Text        | Inter/Sarabun  | 400    | 16px | 1.5         | `#374151` |
| Body Small       | Inter/Sarabun  | 400    | 14px | 1.4         | `#374151` |
| Metadata/Caption | Inter/Sarabun  | 400    | 12px | 1.4         | `#6B7280` |
| Formula/Code     | JetBrains Mono | 400    | 14px | 1.6         | `#111827` |

### 5.3 Typography Guidelines

- Maintain at least **1.4 line height** for body text, **1.6** for technical content
- Use **sentence case** for all labels and section titles
- Use monospace for all scientific formulas, chemical equations, and code
- Avoid decorative fonts; prioritize readability and precision
- Support Unicode Thai characters with no truncation

---

## 6. Components

### 6.1 Cards

- **Border Radius:** 8px (rounded corners)
- **Shadow:** `0px 2px 4px rgba(0,0,0,0.05)` (subtle drop shadow)
- **Structure:**
  - Header section with bold title and status/subject indicator
  - Content area with structured spacing (20px padding)
  - Optional footer for actions or metadata
- **Hover Effect:** Light elevation increase or border tint in Rose 300
- **Active State:** Rose 600 border or background tint

### 6.2 Buttons

| Type      | Background           | Text              | Border              | Radius | Example Use        |
| --------- | -------------------- | ----------------- | ------------------- | ------ | ------------------ |
| Primary   | `#111827` (Black)    | `#FFFFFF` (White) | None                | 6px    | "Start Experiment" |
| Secondary | Transparent          | `#111827`         | 1px solid `#D1D5DB` | 6px    | "Review Lesson"    |
| Accent    | `#9F1239` (Rose 800) | `#FFFFFF`         | None                | 6px    | "Submit Answer"    |
| Success   | `#22C55E` (Green)    | `#FFFFFF`         | None                | 6px    | "Complete"         |
| Disabled  | `#E5E7EB` (Gray)     | `#9CA3AF`         | None                | 6px    | Inactive states    |

**Interaction States:**

- **Hover:** Increase contrast or apply subtle shadow (200-300ms transition)
- **Active:** Depress slightly (1-2px movement)
- **Focus:** Rose 300 outline for keyboard navigation

### 6.3 Progress Indicators

- **Horizontal Bar:**
  - Fill color: Rose 600 (`#E11D48`)
  - Background: Gray 200 (`#E5E7EB`)
  - Height: 6-8px
  - Border radius: 4px (rounded edges)
- **Percentage:** Display on the right, small text (12px)
- **Experiment Progress:** Use subject-specific colors

### 6.4 Status Badges

| Status      | Background | Text      | Border              | Usage                      |
| ----------- | ---------- | --------- | ------------------- | -------------------------- |
| In Progress | `#FEF3C7`  | `#92400E` | None                | Active lessons/experiments |
| Complete    | `#D1FAE5`  | `#065F46` | None                | Finished content           |
| Locked      | `#F3F4F6`  | `#6B7280` | `1px solid #D1D5DB` | Not yet available          |
| Review      | `#DBEAFE`  | `#1E40AF` | None                | Ready for review           |

### 6.5 Leaderboard

- **Table Style:** Minimal with clean lines
- **Columns:** Rank, Avatar, Name, XP, Progress
- **Top Ranks:** Use icons (🥇🥈🥉) or Rose gradient for podium positions
- **Row Shading:** Alternate with `#F9FAFB` for readability
- **Highlight:** Current user row with Rose 50 (`#FFF1F2`) background

### 6.6 Experiment Controls

- **Large Touch Targets:** 48dp minimum for interactive controls
- **Safety Indicators:** Warning orange with 32-48dp icons
- **Subject Color Coding:** Use physics/chemistry/biology colors for equipment
- **Clear Labels:** Always pair icons with text labels

---

## 7. Icons

### 7.1 Icon Guidelines

- **Style:** Line-based, 2px stroke width
- **Icon Set:** Heroicons or Lucide Icons for consistency with Advantage ecosystem
- **Default Color:** Neutral gray (`#6B7280`)
- **Active Color:** Rose 600 (`#E11D48`)
- **Size Standards:**
  - Navigation: 20px
  - Standard UI: 24px
  - Primary actions: 32px
  - Experiment controls: 48px

### 7.2 Custom Icons

- Science-specific icons for equipment and experiments
- Thai cultural elements where appropriate
- Maintain 2px stroke weight for consistency
- SVG format for scalability

---

## 8. Interaction and Animation

### 8.1 Timing

- **Hover/Focus:** 200-300ms ease-in-out transitions
- **Dropdown/Modal:** 250ms fade or slide
- **Page Transitions:** 300ms max

### 8.2 Animation Principles

- Use subtle elevation or color transitions for feedback
- Avoid exaggerated animations—focus on functional clarity
- Experiment simulations may use more complex animations with clear scientific purpose
- Maintain 60fps for smooth interactions

### 8.3 Micro-interactions

- Button press: subtle scale (0.98) or shadow change
- Card hover: elevation increase from 2px to 4px shadow
- Toggle switches: slide with 200ms ease
- Loading states: pulsing Rose 300 indicators

---

## 9. Localization

### 9.1 Language Support

- **Language Selector:** Flag + language name (Thai/English)
- **Text Alignment:** Left-aligned for both English and Thai
- **Font Rendering:** Sarabun for Thai ensures proper character display
- **RTL Support:** Not required for Thai/English but design allows for future expansion

### 9.2 Content Adaptation

- Scientific terms maintain precision in both languages
- Formulas use international notation regardless of language
- Cultural context for examples and experiments when appropriate

---

## 10. Tone and Branding

### 10.1 Visual Tone

The interface is **semi-formal and motivational**, designed for academic environments. It balances **professional structure** with a sense of **scientific curiosity and encouragement** suitable for self-paced learning.

### 10.2 Brand Voice

- **Positive Reinforcement:** "Great observation!", "Experiment complete!"
- **Action-Oriented:** "Start exploring", "Test your hypothesis"
- **Scientifically Precise:** Accurate terminology without being overly technical
- **Encouraging:** Support learning through mistakes and experimentation

### 10.3 Writing Guidelines

- Use simple, action-oriented phrasing
- Avoid overly casual language or corporate jargon
- Maintain scientific accuracy while being approachable
- Support both discovery and structured learning approaches

---

## 11. Accessibility Guidelines

### 11.1 Color Contrast

- **Minimum Ratio:** 4.5:1 for normal text
- **Large Text:** 3:1 for 18pt+ or 14pt+ bold
- **Rose Colors:** Tested for sufficient contrast on white backgrounds

### 11.2 Keyboard Navigation

- All interactive elements must have visible focus states (Rose 300 outline)
- Maintain logical tab order
- Support arrow key navigation in lists and tables
- Escape key closes modals and dropdowns

### 11.3 Screen Reader Support

- Use ARIA labels for icons and navigation
- Proper heading hierarchy (H1 → H2 → H3)
- Alt text for all images and diagrams
- Live regions for dynamic content updates

### 11.4 Interactive Elements

- Minimum touch target: 44x44px (WCAG AAA)
- Clear focus indicators
- Error messages with descriptive text, not just color
- Support for high contrast modes

---

## 12. Ecosystem Consistency

### 12.1 Advantage Family Alignment

| App               | Primary Brand Colors                   | Shared Elements                |
| ----------------- | -------------------------------------- | ------------------------------ |
| Reading Advantage | Sky 400 `#38BDF8`, Sky 900 `#0C4A6E`   | Layout, typography, components |
| Science Advantage | Rose 300 `#FDA4AF`, Rose 800 `#9F1239` | Layout, typography, components |
| Future Apps       | TBD color palette                      | Layout, typography, components |

### 12.2 Shared Design Patterns

- Top navigation with logo, XP, profile
- Left sidebar navigation structure
- Card-based content layout
- Progress indicators and achievements
- Leaderboard design
- Button hierarchy and states

### 12.3 Brand Differentiation

- **Logo Colors:** Unique to each app (Rose for Science)
- **Subject-Specific Elements:** Science uses subject color coding
- **Content-Specific Components:** Experiment controls, formula rendering (Science only)
- **Core Experience:** Maintained across ecosystem

---

## 13. Component Library Reference

The Science Advantage design system is implemented using:

- **shadcn/ui:** Base component library
- **Tailwind CSS:** Utility-first styling
- **Radix UI:** Accessible primitives

Custom components extend these foundations with science-specific functionality while maintaining ecosystem consistency.

---

## 14. Design Tokens

### 14.1 Border Radius

- `sm`: 4px - Small elements, badges
- `md`: 6px - Buttons, inputs
- `lg`: 8px - Cards, panels
- `xl`: 12px - Modal dialogs

### 14.2 Shadows

- `sm`: `0 1px 2px rgba(0,0,0,0.05)` - Subtle elevation
- `md`: `0 2px 4px rgba(0,0,0,0.05)` - Standard cards
- `lg`: `0 4px 8px rgba(0,0,0,0.08)` - Elevated cards, dropdowns
- `xl`: `0 8px 16px rgba(0,0,0,0.1)` - Modals, popovers

---

## 15. Implementation Guidelines

### 15.1 Development Workflow

1. Use design tokens from Tailwind config
2. Build with shadcn/ui components
3. Extend with science-specific variants
4. Test across Thai/English locales
5. Validate accessibility with automated tools

### 15.2 Quality Checklist

- [ ] Rose brand colors applied correctly
- [ ] Subject colors used for appropriate content
- [ ] Typography scales properly across devices
- [ ] Icons maintain 2px stroke weight
- [ ] Spacing follows 8dp grid
- [ ] Contrast ratios meet WCAG AA standards
- [ ] Thai font renders correctly
- [ ] Keyboard navigation works throughout
- [ ] Animations are smooth (60fps)

---

**End of Style Guide**