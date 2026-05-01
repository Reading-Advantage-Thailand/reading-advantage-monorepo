---
version: 1.0
name: Science Advantage
colors:
  primary: "#1B4332" # Deep forest green (scientific/botanical)
  secondary: "#D4A574" # Warm tan/leather (expedition journal)
  accent: "#E76F51" # Terracotta coral (warmth and energy)
  destructive: "#C1121F" # Deep crimson
  background: "#FDF8F3" # Warm cream (aged paper)
  foreground: "#1A1A1A" # Near black (rich ink)
  muted: "#E8E0D5" # Warm light gray
  card: "#FFFFFF" # White cards
  border: "#D4C8B8" # Warm tan border
typography:
  h1:
    fontFamily: "DM Serif Display"
    fontSize: "2.75rem"
    fontWeight: 400
    lineHeight: 1.2
  h2:
    fontFamily: "DM Serif Display"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.3
  h3:
    fontFamily: "DM Sans"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "DM Sans"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  mono:
    fontFamily: "JetBrains Mono"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
---

# Design Specification

## Overview
Science Advantage is a K-12 educational platform for Thai science learning. The design identity draws from **scientific expedition journals and botanical field guides** — warm, trustworthy, and distinctly non-corporate. The aesthetic says "serious learning" rather than "startup SaaS."

## Colors
Inspired by vintage scientific illustrations, field notebooks, and natural history collections.

- **Primary ({colors.primary}):** Deep forest green — scientific, trustworthy, connects to nature/biology.
- **Secondary ({colors.secondary}):** Warm tan/leather — expedition journal, aged paper, craft.
- **Accent ({colors.accent}):** Terracotta coral — warmth, energy, draws attention without being aggressive.
- **Destructive ({colors.destructive}):** Deep crimson — serious warnings, not alarming.
- **Background ({colors.background}):** Warm cream — aged paper quality, easy on eyes for reading.
- **Foreground ({colors.foreground}):** Near-black — rich ink for high legibility.
- **Muted ({colors.muted}):** Warm light gray — subtle backgrounds, dividers.
- **Card ({colors.card}):** Pure white for content cards.
- **Border ({colors.border}):** Warm tan — soft definition without harsh contrast.

## Typography
Editorial mix: serif for authority, sans-serif for clarity.

- **H1 ({typography.h1.fontSize}):** DM Serif Display — elegant, authoritative, educational.
- **H2 ({typography.h2.fontSize}):** DM Serif Display — section anchors.
- **H3 ({typography.h3.fontSize}):** DM Sans semibold — component headings.
- **Body ({typography.body.fontSize}):** DM Sans — clean, highly legible instructional text.
- **Label ({typography.label.fontSize}):** DM Sans medium — metadata, captions.
- **Mono ({typography.mono.fontSize}):** JetBrains Mono — code, technical data.

## Spacing
4px base grid — consistent rhythm across all layouts.

- **Base ({spacing.base}):** 4px
- **Small ({spacing.sm}):** 8px
- **Medium ({spacing.md}):** 16px
- **Large ({spacing.lg}):** 32px
- **Extra Large ({spacing.xl}):** 64px

## Rounded
Subtle rounding — professional but not cold or "techy."

- **Small ({rounded.sm}):** 6px
- **Medium ({rounded.md}):** 8px
- **Large ({rounded.lg}):** 12px (Standard Card Radius)
- **Extra Large ({rounded.xl}):** 16px (Button Radius)
- **Full ({rounded.full}):** Pill shape for badges/tags

## Shadows
Soft, warm shadows — depth without coldness.

- **Subtle:** `0 1px 3px oklch(0.15 0.02 30 / 0.08)`
- **Card:** `0 2px 8px oklch(0.15 0.02 30 / 0.1)`
- **Elevated:** `0 4px 16px oklch(0.15 0.02 30 / 0.12)`

## Components

### EduCard
- **Background:** {colors.card}
- **Border:** 1px {colors.border}
- **Corner Radius:** {rounded.lg}
- **Shadow:** Card elevation
- **Padding:** 24px

### EduButton
- **Primary:** {colors.primary} background, white text
- **Secondary:** {colors.secondary} background, dark text
- **Accent:** {colors.accent} background, white text
- **Radius:** {rounded.xl}
- **Padding:** 12px 24px
- **Font:** DM Sans 500
- **Hover:** subtle lift shadow

### EduInput
- **Background:** {colors.card}
- **Border:** 1px {colors.border}
- **Radius:** {rounded.md}
- **Focus:** 2px {colors.primary} ring

### EduBadge
- **Rounded:** {rounded.full}
- **Padding:** 4px 12px
- **Font:** DM Sans 500, {typography.label.fontSize}

## Do's and Don'ts

### Do
- Use serif headings for authority and educational feel.
- Maintain warm color temperatures (creams, tans, forest greens).
- Use generous whitespace for content readability.
- Employ subtle shadows for depth without heaviness.

### Don't
- Use generic "modern/clean/sleek" startup aesthetics.
- Use bright blue or purple gradients.
- Use sharp corners (square or very rounded).
- Overcrowd content — respect the reading experience.
- Use Inter/Roboto/system-ui for headings.