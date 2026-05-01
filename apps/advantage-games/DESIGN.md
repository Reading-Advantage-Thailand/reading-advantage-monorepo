---
version: 3.0.0
name: Vercel Core
colors:
  primary: "#FFFFFF"
  primary-foreground: "#000000"
  secondary: "#111111"
  secondary-foreground: "#EDEDED"
  background: "#000000"
  foreground: "#FFFFFF"
  card: "#000000"
  card-foreground: "#FFFFFF"
  popover: "#000000"
  popover-foreground: "#FFFFFF"
  muted: "#111111"
  muted-foreground: "#888888"
  accent: "#FFFFFF"
  accent-foreground: "#000000"
  destructive: "#FF0000"
  border: "#333333"
  input: "#000000"
  ring: "#888888"
typography:
  display-lg:
    fontFamily: sans
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "-0.05em"
  display-md:
    fontFamily: sans
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "-0.04em"
  headline-lg:
    fontFamily: sans
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline-md:
    fontFamily: sans
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title-lg:
    fontFamily: sans
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.3
  title-md:
    fontFamily: sans
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.3
  body-lg:
    fontFamily: sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.6
  label-lg:
    fontFamily: sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.0
  label-md:
    fontFamily: sans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.0
spacing:
  0: 0px
  4: 4px
  8: 8px
  16: 16px
  24: 24px
  32: 32px
  48: 48px
  64: 64px
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 24px
  full: 9999px
---

# Vercel Core Design System

## Philosophy
Vercel Core is a minimalist, high-precision visual identity inspired by developer-focused tools and modern software deployment platforms. It emphasizes clarity through monochrome rigor, intentional whitespace, and a strict adherence to the Geist typeface. It rejects "AI slop" and decorative excess in favor of functional elegance and mathematical balance.

## Color Palette: Monochrome Precision
We use a grayscale spectrum to define hierarchy, using contrast rather than color to guide the eye.

- **Deep Black (#000000):** The primary canvas. Used for background and foundational layers.
- **Pure White (#FFFFFF):** The focus. Used for primary text, highlights, and high-emphasis elements.
- **Gray Alpha (#888888):** The structure. Used for secondary text and muted borders.
- **Gray Dark (#111111):** The depth. Used for cards, popovers, and secondary backgrounds.
- **Vercel Red (#FF0000):** The exception. Reserved strictly for destructive actions and critical system failures.

## Typography: Geist Rigor
The system is built entirely on the Geist typeface family, optimized for readability and technical precision.

- **Geist Sans:** The primary interface font. Used for headers, titles, and standard body text. It is clean, geometric, and balanced.
- **Geist Mono:** The technical font. Used for data, labels, code snippets, and small metadata. It provides a sense of underlying engineering.

## Structural Mandates
- **Borders:** Subtle but defined. Use 1px borders in Gray Dark (#333333) to separate sections without adding visual weight.
- **Roundedness:** Controlled softening. Standard radius is 8px (md) for cards and inputs, creating a professional but approachable feel.
- **Shadows:** Avoid blurs. Depth is communicated through color layers (Gray Dark on Deep Black) or very subtle white-glow borders on focus.
- **Grid:** Strict 8px increments. All spacing and sizing must align to an 8pt baseline.

## Component Guidelines
- **Buttons:** Solid White with Black text for primary actions. Bordered Gray Dark for secondary. Minimal 150ms transitions on hover.
- **Cards:** Background Gray Dark (#111111) with 1px borders. No box-shadows.
- **Inputs:** Black background with a 1px border that turns White when focused. Label text should be Geist Mono.

## Do's and Don'ts
- **Do:** Prioritize typography over icons or images.
- **Do:** Use whitespace as a functional element to group related content.
- **Do:** Stick to a 100% monochrome palette (with red as the only exception).
- **Don't:** Use gradients, shadows, or rounded corners larger than 12px.
- **Don't:** Use generic buzzwords like "sleek" or "modern" to justify design choices—use "precise" and "functional."
