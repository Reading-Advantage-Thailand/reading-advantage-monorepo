---
version: 1.0.0
name: Reading Advantage Thailand
colors:
  primary: "#0F172A"
  secondary: "#F1F5F9"
  accent: "#0EA5E9"
  background: "#FFFFFF"
  foreground: "#020817"
  muted: "#F1F5F9"
  destructive: "#EF4444"
  border: "#E2E8F0"
  sky-400: "#38BDF8"
  sky-500: "#0EA5E9"
  sky-900: "#0C4A6E"
  indigo-300: "#A5B4FC"
  indigo-800: "#3730A3"
  indigo-900: "#312E81"
  rose-300: "#FDA4AF"
  rose-800: "#9F1239"
  orange-300: "#FDBA74"
  orange-800: "#9A3412"
  fuchsia-300: "#F0ABFC"
  fuchsia-800: "#86198F"
  emerald-300: "#6EE7B7"
  emerald-800: "#065F46"
  amber-300: "#FCD34D"
  amber-800: "#92400E"
  cyan-400: "#22D3EE"
  cyan-800: "#155E75"
  slate-700: "#334155"
  slate-800: "#1E293B"
  slate-900: "#0F172A"
  cool-border: "#E6E8EC"
  dark-border: "#525A69"
  light-frost: "#EFF1F3"
typography:
  display-2xl:
    fontFamily: Geist
    fontSize: 72px
    fontWeight: 800
    lineHeight: 1.1
  display-xl:
    fontFamily: Geist
    fontSize: 60px
    fontWeight: 700
    lineHeight: 1.2
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.2
  headline-lg:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.3
  headline-md:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.3
  title-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.4
  title-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.4
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
spacing:
  base: 4px
  s1: 4px
  s2: 8px
  s3: 12px
  s4: 16px
  s6: 24px
  s8: 32px
  s12: 48px
  s16: 64px
  s20: 80px
  s24: 96px
  s32: 128px
rounded:
  none: 0px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  "2xl": 16px
  "3xl": 24px
  full: 9999px
---

# Reading Advantage Thailand Design System

## Overview
This design system provides a modern, clean, and professional aesthetic for the Reading Advantage Thailand platform. It leverages a blue-centric color palette, glassmorphism, and the Geist typography family to create an engaging EdTech experience.

## Colors

### Core Palette
- **Primary (#0F172A):** Used for main headings, navigation, and primary branding.
- **Accent (#0EA5E9):** Our brand sky blue, used for CTA buttons, active states, and highlights.
- **Secondary (#F1F5F9):** A soft slate used for backgrounds and subtle borders.
- **Destructive (#EF4444):** Used for error states and destructive actions.

### Functional Colors
- **Background (#FFFFFF):** Main surface color.
- **Foreground (#020817):** Default text color for high contrast.
- **Muted (#F1F5F9):** Background for muted elements.
- **Border (#E2E8F0):** Standard border color.

### Product-Specific Palettes
- **Reading Advantage (Sky):** Sky 400 (#38BDF8), Sky 900 (#0C4A6E). Logo uses Sky 500 and Indigo 900.
- **STEM Advantage (Indigo):** Indigo 300 (#A5B4FC), Indigo 800 (#3730A3).
- **Science Advantage (Rose):** Rose 300 (#FDA4AF), Rose 800 (#9F1239).
- **Math Advantage (Orange):** Orange 300 (#FDBA74), Orange 800 (#9A3412).
- **Zhongwen Advantage (Fuchsia):** Fuchsia 300 (#F0ABFC), Fuchsia 800 (#86198F).
- **Tutor Advantage (Emerald):** Emerald 300 (#6EE7B7), Emerald 800 (#065F46).
- **Storytime Advantage (Amber):** Amber 300 (#FCD34D), Amber 800 (#92400E).
- **Primary Advantage (Cyan):** Cyan 400 (#22D3EE), Cyan 800 (#155E75).

### Specialized UI Colors
- **Cool Border (#E6E8EC):** Used for subtle UI dividers.
- **Dark Border (#525A69):** Used for borders on dark elements.
- **Light Frost (#EFF1F3):** Used for hover states on light backgrounds.

## Typography
We use the **Geist** variable font family for all typography, ensuring readability and a modern feel across all platforms.

- **Geist (Sans):** Primary font for all UI elements.
- **GeistMono:** Used for technical data, code snippets, and specific labels.

## Spacing
Our spacing system is based on a **4px** grid.

- **Base Unit:** 4px
- **s1-s4:** Standard spacing for internal component padding.
- **s6-s8:** Used for component margins and smaller section gaps.
- **s12-s32:** Used for large section spacing and page layout.

## Roundness
Rounded corners are used to convey a friendly and approachable feel.

- **Small (sm):** 4px. Used for small inputs and buttons.
- **Medium (md):** 6px. Standard for medium components.
- **Large (lg):** 8px. Default for cards and large buttons (`var(--radius)`).
- **Extra Large (xl/2xl/3xl):** 12px to 24px. Used for prominent feature sections and image containers.
- **Full:** 9999px. Used for pills and circular avatars.

## Elevation and Depth
We prefer "Soft Depth" using subtle shadows and glassmorphism.

- **Modern Shadow:** `0 10px 25px -5px rgba(0, 0, 0, 0.1)`
- **Glassmorphism:** `bg-white/10 backdrop-blur-md border border-white/20`
- **Glow:** Subtle blue glow for active brand elements.

## Gradients
- **Brand Accent:** `linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)`
- **Hero Gradient:** `linear-gradient(135deg, rgba(14, 165, 233, 0.9) 0%, rgba(6, 182, 212, 0.8) 50%, rgba(59, 130, 246, 0.9) 100%)`

## Do's and Don'ts
### Do
- Use `bg-sky-50` for light section backgrounds.
- Apply `glass-morphism` for overlay cards.
- Use `animate-float` for hero images to add life to the page.
- Keep text contrast high using `text-sky-900` on light backgrounds.

### Don't
- Don't use harsh black (#000000) for text; prefer `text-foreground`.
- Don't use aggressive rotation or hard offset shadows (legacy artifacts).
- Don't mix different border radii in the same component.
