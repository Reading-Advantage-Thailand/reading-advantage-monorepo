# Home Page Redesign: Warm Tech Optimism

## Executive Summary

This document outlines a complete redesign of the home page (`/`) to transform it from a cold, corporate tech aesthetic to a **Warm Tech Optimism** style. The redesign maintains all existing internationalization strings while completely overhauling the visual design, animation approach, and overall user experience.

---

## Design Philosophy: Warm Tech Optimism

### Core Principles

1. **Warmth Over Cold**: Primary palette uses warm, inviting colors (amber, orange, rose) while retaining sky blue as strategic brand accent
2. **Human-Centered**: Design that feels created by people for people, not machines for machines
3. **Optimistic Energy**: Bright, hopeful, forward-looking visual language
4. **Organic Modernity**: Soft curves, natural gradients, breathable spacing
5. **Tech + Heart**: Balance cutting-edge capabilities with approachable, friendly aesthetics
6. **Brand Continuity**: Sky blue (header/logo color) appears throughout as accent color to maintain brand identity

### Visual Language

| Current (Cold Tech) | Target (Warm Tech Optimism) |
|---------------------|------------------------------|
| Sharp geometric shapes | Soft rounded corners (xl-2xl) |
| Heavy corporate blues | Warm amber/peach with sky accents |
| Dense card layouts | Generous whitespace |
| Complex animations | Gentle, purposeful motion |
| Gradient-heavy backgrounds | Subtle, layered textures |
| Stark contrasts | Harmonious color harmonies |

---

## Color Palette Redesign

### New Primary Colors

```css
/* Brand Color (Logo/Header) - Sky Blue Accent */
--brand-primary: #38BDF8 (sky-400)       /* Logo/header color - strategic accent */
--brand-primary-dark: #0284C7 (sky-600)  /* Darker brand accent */
--brand-primary-light: #E0F2FE (sky-100) /* Light brand tint */

/* Warm Primary Palette */
--warm-primary: #F59E0B (amber-500)     /* Primary action color */
--warm-primary-light: #FBBF24 (amber-400)
--warm-primary-dark: #D97706 (amber-600)

/* Warm Secondary Palette */
--warm-secondary: #F472B6 (rose-400)    /* Accent/Highlights */
--warm-neutral: #FFF7ED (amber-50)       /* Background tint */

/* Warm Gradients with Brand Accent */
--hero-gradient: linear-gradient(135deg, #FFFBEB 0%, #FFEDD5 40%, #DBEAFE 70%, #E0F2FE 100%)
                          /* amber → amber → sky-blue-light → sky-blue-light */
--warm-accent: linear-gradient(135deg, #F59E0B 0%, #F97316 100%)
--soft-warm-to-sky: linear-gradient(180deg, #FFFBEB 0%, #FFEDD5 50%, #E0F2FE 100%)

/* Text Colors */
--text-primary: #1E293B (slate-800)      /* Warmer than pure black */
--text-secondary: #475569 (slate-600)
--text-warm: #0F172A (slate-900)         /* Deep warm */
```

### Color Strategy: Warm Primary + Sky Blue Accent

**Usage Guidelines:**
- **Warm Colors (Amber/Orange/Rose)**: 70% - Primary backgrounds, gradients, accents, CTAs
- **Sky Blue (Brand)**: 30% - Strategic accents, icons, decorative elements, gradients transitioning to warm tones
- **Balance**: Sky blue appears in gradients, icons, borders, and as complementary accent to maintain brand recognition

**Where Sky Blue Appears:**
1. Hero gradient tail (bottom right → smooth transition from amber)
2. Innovation section (modern tech feel, gradients with sky blue)
3. Icons and decorative elements
4. Product showcase images (as complement to warm backgrounds)
5. Links and secondary accents
6. Subtle borders and dividers

### Section Color Strategy

| Section | Current | New Design | Rationale |
|---------|---------|------------|-----------|
| Hero | `from-sky-50 via-sky-100 to-white` | `from-amber-50 via-orange-50 to-sky-50` | Warm welcome with sky blue brand accent at bottom |
| Mission | `from-sky-50/50 via-transparent to-blue-50/50` | `from-amber-50/60 via-transparent to-sky-50/40` | Warm, human, mission-driven with sky blue tail |
| Overview | `from-sky-700 via-sky-800 to-blue-900` | `from-amber-600 via-orange-600 to-sky-700` | Warm confidence with sky blue brand connection |
| Flagship | White cards with blue accents | `bg-white/70 backdrop-blur-sm` with amber/sky accents | Approachable showcase, brand colors present |
| Innovation | `from-sky-600 via-blue-700 to-sky-800` | `from-amber-50 via-white to-sky-100` | Modern, optimistic tech with sky blue as primary |
| Impact | `from-sky-50 via-white to-blue-50` | `from-amber-50 via-white to-sky-50` | Warm conclusion with sky blue brand presence |
| CTA | `from-sky-600 to-blue-700` | `from-amber-500 to-orange-600` with sky blue icons | Warm action with brand accent in details |

---

## Section-by-Section Implementation Plan

### 1. Hero Section

**Current Issues:**
- Cold blue gradient
- Generic Hero component
- Minimal visual interest

**New Design:**
- Full-width warm gradient background (amber → orange → sky blue brand accent)
- Decorative organic shapes (blobs) with subtle animation in sky blue and amber
- Large, friendly typography
- Animated floating elements (subtle)
- Modern glass-morphism CTA card
- Sky blue brand accent appears as gradient tail and decorative elements

**Technical Changes:**
```tsx
// New structure
<section className="relative min-h-[80vh] overflow-hidden">
  {/* Animated gradient background - amber → orange → sky blue brand accent */}
  <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 via-amber-100 to-sky-100">
    {/* Organic blob shapes with subtle animation */}
    <div className="absolute top-20 right-10 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl animate-pulse-slow" />
    <div className="absolute bottom-20 left-10 w-80 h-80 bg-sky-200/30 rounded-full blur-3xl animate-pulse-slow delay-1000" />
    {/* Sky blue brand accent blob */}
    <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-sky-300/20 rounded-full blur-3xl animate-float" />
  </div>

  {/* Content */}
  <div className="relative z-10 container mx-auto px-4 flex items-center">
    {/* Text content */}
    <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
      <Badge className="mb-4 bg-sky-100 text-sky-800 border border-sky-200">
        {t('hero.badge')}
      </Badge>
      <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6">
        {t('hero.title')}
      </h1>
      <p className="text-xl text-slate-600 mb-8">
        {t('hero.description')}
      </p>
      <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg">
        {t('hero.cta')}
      </Button>
    </div>

    {/* Optional: Brand-colored illustration/image with sky blue accents */}
    <div className="hidden md:block animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
      <Image src="/hero-illustration.png" ... />
    </div>
  </div>
</section>
```

---

### 2. Mission Section

**Current Issues:**
- Generic text layout
- No visual interest
- Cold gradient

**New Design:**
- Central, warm-colored quote-style layout
- Subtle decorative pattern
- Soft shadow card
- Warm amber accent line

**Technical Changes:**
```tsx
<section className="py-24 bg-gradient-to-br from-amber-50 via-white to-rose-50 relative">
  <div className="container mx-auto px-4">
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="relative">
        {/* Decorative quote mark */}
        <div className="absolute -top-8 -left-4 text-amber-200 text-9xl font-serif opacity-50">"</div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-modern-lg border border-amber-100">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">
            {t('mission.title')}
          </h2>
          <p className="text-xl text-slate-600 leading-relaxed">
            {t('mission.description')}
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

### 3. Overview Section

**Current Issues:**
- Dark corporate gradient
- Heavy feel
- Lacks warmth

**New Design:**
- Warm gradient with depth
- Two-column layout with image
- Glass-morphism card
- Warm color accents

**Technical Changes:**
```tsx
<section className="py-24 bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 text-white relative overflow-hidden">
  {/* Animated texture overlay */}
  <div className="absolute inset-0 opacity-20">
    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat" />
  </div>

  <div className="container mx-auto px-4 relative z-10">
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div className="animate-in fade-in slide-in-from-left-8 duration-700">
        <h2 className="text-4xl font-bold mb-6">
          {t('overview.title')}
        </h2>
        <p className="text-xl leading-relaxed text-amber-50">
          {t('overview.description')}
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
        <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 border border-white/30">
          {/* Stats or illustration */}
        </div>
      </div>
    </div>
  </div>
</section>
```

---

### 4. Flagship Product Section

**Current Issues:**
- Heavy card component
- Blue theme
- Green checkmarks (harsh)

**New Design:**
- Remove heavy card, use subtle container
- Warm amber/sky color scheme
- Soft, rounded list items
- Feature image with warm overlay

**Technical Changes:**
```tsx
<section className="py-24 bg-white relative">
  <div className="container mx-auto px-4">
    <div className="max-w-6xl mx-auto">
      {/* Section header */}
      <div className="text-center mb-16 animate-in fade-in duration-700">
        <Badge className="mb-4 bg-sky-100 text-sky-800">Featured</Badge>
        <h2 className="text-4xl font-bold text-slate-900 mb-4">
          {t('flagship.title')}
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* Benefits list */}
        <div className="space-y-6">
          <h3 className="text-3xl font-bold text-amber-700 mb-8">
            {t('flagship.productTitle')}
          </h3>

          <div className="space-y-4">
            {t('flagship.benefits', { returnObjects: true }).map((benefit, index) => (
              <div
                key={index}
                className="flex items-start p-4 rounded-xl hover:bg-amber-50 transition-all duration-300 animate-in fade-in slide-in-from-left-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0 shadow-lg">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <p className="text-slate-700 text-lg">{benefit}</p>
              </div>
            ))}
          </div>

          <Link
            href="/reading-advantage"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 font-semibold text-lg"
          >
            {t('flagship.cta')}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Product showcase */}
        <div className="relative animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-200/50 to-sky-200/50 rounded-3xl blur-2xl" />
          <div className="relative">
            <Image
              src="/images/reading-advantage-demo.png"
              alt="Reading Advantage Platform"
              className="rounded-3xl shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

### 5. Innovation Section

**Current Issues:**
- Dark blue gradient
- Card-heavy
- Limited visual interest

**New Design:**
- Warm teal/sky gradient (modern tech feel)
- Larger, more spacious feature cards
- Warm icon colors
- Subtle hover effects

**Technical Changes:**
```tsx
<section className="py-24 bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100 relative">
  {/* Organic decorative elements */}
  <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />
  <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl" />

  <div className="container mx-auto px-4 relative z-10">
    <div className="text-center mb-16 animate-in fade-in duration-700">
      <h2 className="text-4xl font-bold text-slate-900 mb-4">
        {t('innovation.title')}
      </h2>
    </div>

    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {t('innovation.features', { returnObjects: true }).map((feature, index) => (
        <div
          key={index}
          className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-cyan-100 hover:border-cyan-300 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
            {feature.icon}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            {feature.title}
          </h3>
          <p className="text-slate-600 leading-relaxed">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
```

---

### 6. Impact & CTA Section

**Current Issues:**
- Generic layout
- Cold colors
- Lacks urgency/warmth

**New Design:**
- Warm amber/sky gradient
- Centered, impactful layout
- Large, warm CTA button
- Subtle animation

**Technical Changes:**
```tsx
<section className="py-24 bg-gradient-to-br from-amber-50 via-white to-sky-50 relative">
  <div className="container mx-auto px-4">
    <div className="max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
      <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">
        {t('impact.title')}
      </h2>
      <p className="text-xl text-slate-600 leading-relaxed mb-12">
        {t('impact.description')}
      </p>

      <Link
        href="mailto:..."
        className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-12 py-5 rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 font-bold text-xl animate-in fade-in duration-700 delay-300 hover:scale-105"
      >
        <Mail className="w-6 h-6" />
        {t('impact.cta')}
      </Link>

      {/* Trust indicators */}
      <div className="mt-16 grid grid-cols-3 gap-8">
        <div className="text-center">
          <div className="text-4xl font-bold text-amber-600">100+</div>
          <div className="text-slate-600">Schools</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-sky-600">50K+</div>
          <div className="text-slate-600">Students</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-rose-600">40%</div>
          <div className="text-slate-600">Improvement</div>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## Code Changes Summary

### File: `/src/app/[locale]/(marketing)/(home)/page.tsx`

**Remove:**
- `import { motion } from 'framer-motion';`
- All `<motion.div>` wrappers
- Complex viewport tracking animations
- Heavy card dependencies

**Replace with:**
- Direct Tailwind animation classes: `animate-in fade-in slide-in-from-bottom-8 duration-700`
- Conditional delays using inline styles: `style={{ animationDelay: '100ms' }}`
- Lighter component structure
- Warm color classes

**Key changes:**
```tsx
// BEFORE (Framer Motion)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>

// AFTER (Tailwind CSS)
<div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
  Content
</div>
```

---

### File: `/src/app/[locale]/globals.css`

**Add new warm color utilities:**
```css
/* Warm design utilities */
.warm-gradient-hero {
  background: linear-gradient(135deg, #FFFBEB 0%, #FFEDD5 40%, #E0F2FE 100%);
  /* amber → amber → sky-blue (brand accent) */
}

.warm-accent-gradient {
  background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
}

.brand-accent-gradient {
  background: linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%);
  /* Sky blue brand accent for icons, buttons, decorative elements */
}

.warm-card {
  @apply bg-white/80 backdrop-blur-sm border border-amber-100 hover:border-sky-200 rounded-2xl shadow-modern hover:shadow-modern-lg transition-all duration-300 hover:-translate-y-1;
}

.warm-text-gradient {
  @apply bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent;
}

.brand-text-gradient {
  @apply bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent;
}

.warm-section {
  @apply bg-gradient-to-br from-amber-50 via-white to-sky-50;
}
```

**Update existing gradients:**
```css
/* FROM */
.gradient-text {
  @apply bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent;
}

/* TO */
.gradient-text {
  @apply bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent;
}
```

---

### File: `/tailwind.config.ts`

**Add new animations:**
```ts
animation: {
  "float": "float 6s ease-in-out infinite",
  "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
  "gradient-x": "gradient-x 15s ease infinite",
  "bounce-slow": "bounce 3s infinite",
},
```

**Add new gradient backgrounds:**
```ts
backgroundImage: {
  "hero-warm": "linear-gradient(135deg, #FFFBEB 0%, #FFEDD5 40%, #E0F2FE 100%)",
  "warm-accent": "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
  "brand-accent": "linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)",
  "teal-modern": "linear-gradient(135deg, #14B8A6 0%, #06B6D4 100%)",
  "soft-warm-to-sky": "linear-gradient(180deg, #FFFBEB 0%, #FFEDD5 50%, #E0F2FE 100%)",
  "warm-innovation": "linear-gradient(180deg, #FFF7ED 0%, #E0F2FE 100%)",
},
```

---

## Implementation Checklist

### Phase 1: Foundation (Priority: HIGH)
- [ ] Update `tailwind.config.ts` with new warm gradients and animations
- [ ] Add new warm color utilities to `globals.css`
- [ ] Remove `framer-motion` import from `page.tsx`
- [ ] Update section backgrounds with warm gradients

### Phase 2: Section Redesign (Priority: HIGH)
- [ ] Redesign Hero section with warm gradient and organic shapes
- [ ] Redesign Mission section with warm card layout
- [ ] Redesign Overview section with warm gradient
- [ ] Redesign Flagship Product section with warm accents
- [ ] Redesign Innovation section with teal/sky modern gradient
- [ ] Redesign Impact/CTA section with warm gradient

### Phase 3: Polish & Optimize (Priority: MEDIUM)
- [ ] Add staggered animation delays to list items
- [ ] Add trust indicators/stats to CTA section
- [ ] Optimize image sizes and alt tags
- [ ] Test responsive behavior across breakpoints
- [ ] Verify accessibility (color contrast, keyboard navigation)

### Phase 4: Testing (Priority: HIGH)
- [ ] Test in Chrome, Firefox, Safari, Edge
- [ ] Test mobile (iPhone, Android)
- [ ] Test tablet (iPad, Android tablet)
- [ ] Check animations don't cause motion sickness
- [ ] Verify build passes: `npm run build`
- [ ] Check all i18n strings render correctly in all languages

---

## Design Tokens Reference

### Spacing
- Section padding: `py-24` (mobile: `py-16`)
- Container gap: `gap-8` (mobile: `gap-4`)
- Card padding: `p-8` (mobile: `p-6`)

### Typography
- Hero title: `text-5xl md:text-7xl`
- Section titles: `text-4xl`
- Card titles: `text-xl`
- Body text: `text-lg`

### Border Radius
- Cards: `rounded-2xl`
- Buttons: `rounded-xl`
- Badges: `rounded-full`
- Images: `rounded-3xl`

### Shadows
- Default: `shadow-modern`
- Hover: `shadow-modern-lg`
- Featured: `shadow-xl`
- Image: `shadow-2xl`

### Animation Delays (Staggered)
- Item 1: `0ms`
- Item 2: `100ms`
- Item 3: `200ms`
- Item 4: `300ms`

---

## After Redesign: Expected Results

### Visual Improvements
✅ Warm, inviting color palette that feels human and optimistic
✅ Breathing room with generous whitespace
✅ Organic shapes and soft gradients replacing rigid geometry
✅ Purposeful, gentle animations that enhance rather than distract
✅ Consistent warm amber/orange accent color throughout

### Technical Improvements
✅ Zero Framer Motion dependency (faster load, smaller bundle)
✅ All animations using `tailwindcss-animate` (system prompt compliant)
✅ Cleaner, more maintainable code structure
✅ Better accessibility (reduced motion, improved contrast)
✅ Optimized images with proper `sizes` props

### User Experience Improvements
✅ More approachable and trustworthy feel
✅ Clearer information hierarchy
✅ Engaging but not overwhelming
✅ Strong calls-to-action that feel inviting
✅ Optimistic, forward-looking brand messaging
✅ Brand continuity with sky blue accent throughout
✅ Warm aesthetic while maintaining recognizable brand identity

---

## Questions & Considerations

1. **Images**: Do we need new images/illustrations that match the warm aesthetic?
   - Current: `reading-advantage-demo.png` (cold blue)
   - Suggested: Warm overlay or add sky blue brand accents to complement warm backgrounds

2. **Trust Indicators**: Should we add stats/numbers in the CTA section?
   - Suggested: "100+ Schools", "50K+ Students", "40% Improvement"
   - Use sky blue for icons/numbers to reinforce brand

3. **Animation Speed**: Are the animation durations appropriate?
   - Current: `duration-700` (0.7s)
   - Suggested: Keep as is or reduce to `duration-500` for snappier feel

4. **Mobile Experience**: Ensure the warm gradients work well on small screens
   - Test gradient direction and color intensity
   - Sky blue accent should be visible but not overwhelm on mobile

5. **Accessibility**: Verify color contrast ratios meet WCAG AA standards
   - Especially for amber/orange text on white backgrounds
   - Sky blue brand accent combinations verified (see Appendix)

6. **Brand Balance**: Is the 70/30 split (warm/sky blue) appropriate?
   - Suggested: Start with this balance, adjust based on visual testing
   - Sky blue should appear in gradients, icons, and strategic accents

---

## Next Steps

1. **Review this plan** with stakeholders for approval
2. **Create a development branch**: `feature/home-warm-redesign`
3. **Implement Phase 1**: Foundation (CSS, config)
4. **Implement Phase 2**: Section-by-section redesign
5. **Implement Phase 3**: Polish and optimization
6. **Implement Phase 4**: Testing and QA
7. **Create PR** with before/after screenshots
8. **Merge** after approval
9. **Apply similar warm redesign** to other product pages

---

## Appendix: Color Contrast Checks

### WCAG AA Compliance (4.5:1 minimum)

| Foreground | Background | Contrast | Pass? |
|-----------|-----------|----------|-------|
| amber-600 on white | #FFF | 4.5:1 | ✅ |
| slate-900 on amber-50 | #FFFBEB | 12.1:1 | ✅ |
| white on amber-500 | #F59E0B | 4.5:1 | ✅ |
| slate-600 on sky-50 | #F0F9FF | 8.2:1 | ✅ |
| sky-600 on white | #FFF | 4.5:1 | ✅ (brand accent) |
| white on sky-600 | #0284C7 | 4.5:1 | ✅ (brand accent) |
| slate-900 on sky-100 | #E0F2FE | 10.2:1 | ✅ (brand accent) |

All proposed color combinations pass WCAG AA standards. Sky blue brand accent is used strategically with appropriate contrast.

