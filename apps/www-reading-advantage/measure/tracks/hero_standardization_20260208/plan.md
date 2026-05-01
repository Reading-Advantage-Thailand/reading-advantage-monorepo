# Implementation Plan: Hero Section Standardization

## Phase 1: Hero Component Development

### Task: Create Hero Component Foundation

- [ ] Write TypeScript interface test for HeroProps
- [ ] Create component file `src/components/marketing/hero-section.tsx`
- [ ] Implement basic component structure with required props (title, description, ctaButton)
- [ ] Write test to verify component renders with minimal props
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Create base hero component structure`

### Task: Implement Unified Background Gradient

- [ ] Write test to verify default background gradient is applied
- [ ] Implement background gradient logic with unified amber/orange/sky palette
- [ ] Add customGradient prop override support
- [ ] Write test to verify customGradient prop overrides default
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Add unified background gradient with override`

### Task: Implement Organic Blob Decorations

- [ ] Write test to verify blob decorations render when showDecorations=true
- [ ] Write test to verify blobs hidden when showDecorations=false
- [ ] Implement 2-3 organic blobs with blur effects
- [ ] Add animate-pulse-slow animation to one blob
- [ ] Add aria-hidden="true" to all blobs
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Add organic blob decorations with animations`

### Task: Implement Height System

- [ ] Write test to verify 'medium' height applies min-h-[70vh]
- [ ] Write test to verify 'tall' height applies min-h-[90vh]
- [ ] Write test to verify default height is medium
- [ ] Implement height prop logic
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Add height system (tall/medium variants)`

### Task: Implement Badge System

- [ ] Write test for each badge variant (amber, sky, green, rose, yellow)
- [ ] Write test for custom badge color
- [ ] Write test to verify badge icon renders
- [ ] Implement badge rendering with variant mapping
- [ ] Add proper spacing and styling
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Add badge system with variants`

### Task: Implement CTA Button System

- [ ] Write test for each button variant (primary, secondary, white, outline)
- [ ] Write test to verify icon renders in button
- [ ] Write test to verify hover effects apply
- [ ] Implement button rendering with variant mapping
- [ ] Add hover animations and transitions
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Add CTA button system with variants`

### Task: Implement Floating Image System

- [ ] Write test to verify floating image renders when provided
- [ ] Write test to verify hidden when not provided
- [ ] Write test to verify image hidden on mobile (< xl)
- [ ] Implement floating image container with proper dimensions
- [ ] Add background blur and gradient overlay
- [ ] Add entry animations
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Add floating image system`

### Task: Implement Alignment System

- [ ] Write test to verify 'center' alignment centers text
- [ ] Write test to verify 'left' alignment aligns text left
- [ ] Write test to verify 'left' alignment shows floating image
- [ ] Implement alignment prop logic
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Add alignment system (left/center variants)`

### Task: Add Entry Animations

- [ ] Write test to verify fade-in animation applies to text container
- [ ] Write test to verify slide-in-from-bottom-8 applies
- [ ] Write test to verify floating image has delay-300
- [ ] Implement animation classes using tailwindcss-animate
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Add entry animations to all elements`

### Task: Implement Mobile Responsiveness

- [ ] Write test to verify title text scales from text-5xl to text-8xl
- [ ] Write test to verify description text scales properly
- [ ] Write test to verify floating image hidden on mobile
- [ ] Write test to verify CTA buttons stack on mobile
- [ ] Implement responsive breakpoints
- [ ] Run tests and confirm pass
- [ ] Commit with message: `feat(hero): Add mobile responsive design`

### Task: Measure - User Manual Verification 'Phase 1: Hero Component Development' (Protocol in workflow.md)

---

## Phase 2: Page Migration Batch 1 - Critical Pages

### Task: Migrate Home Page Hero

- [ ] Write test to verify home page imports new hero component
- [ ] Replace home page inline hero with new Hero component
- [ ] Configure props: height="tall", alignment="left", badge with "Sparkles" icon
- [ ] Configure CTA button with "Explore Products" primary button
- [ ] Remove all inline hero code (blobs, images, containers)
- [ ] Verify visual match with current design
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(home): Migrate to new hero component`

### Task: Migrate Products Overview Page Hero

- [ ] Write test to verify products page imports new hero component
- [ ] Replace products page inline hero with new Hero component
- [ ] Configure props: height="medium", alignment="center"
- [ ] Configure floating image with small-group.png
- [ ] Remove glassmorphism card wrapper
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(products): Migrate overview hero to new component`

### Task: Migrate Services Overview Page Hero

- [ ] Write test to verify services page imports new hero component
- [ ] Replace services page inline hero with new Hero component
- [ ] Configure props: height="medium", alignment="center"
- [ ] Configure CTA button
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(services): Migrate overview hero to new component`

### Task: Measure - User Manual Verification 'Phase 2: Page Migration Batch 1' (Protocol in workflow.md)

---

## Phase 3: Page Migration Batch 2 - Product Detail Pages

### Task: Migrate Reading Advantage Page Hero

- [ ] Write test to verify reading-advantage page imports new hero component
- [ ] Replace inline hero with new Hero component
- [ ] Configure props: height="medium", alignment="left"
- [ ] Configure floating image with students-at-board.png
- [ ] Configure CTA buttons (Platform features, Blended learning)
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(reading-advantage): Migrate hero to new component`

### Task: Migrate Math Advantage Page Hero

- [ ] Write test to verify math-advantage page imports new hero component
- [ ] Remove old Hero component usage
- [ ] Add new Hero component with custom gradient (orange theme)
- [ ] Configure badge: variant="yellow", text="Coming Soon"
- [ ] Add math-advantage logo image in title
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(math-advantage): Migrate hero to new component`

### Task: Migrate Science Advantage Page Hero

- [ ] Write test to verify science-advantage page imports new hero component
- [ ] Remove old Hero component usage
- [ ] Add new Hero component with custom gradient (rose theme)
- [ ] Configure badge: variant="rose", text="Coming Soon"
- [ ] Add science-advantage logo image in title
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(science-advantage): Migrate hero to new component`

### Task: Migrate STEM Advantage Page Hero

- [ ] Write test to verify stem-advantage page imports new hero component
- [ ] Remove old Hero component usage
- [ ] Add new Hero component with unified gradient
- [ ] Configure badge: variant="sky", text="Coming Soon"
- [ ] Add stem-advantage logo image in title
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(stem-advantage): Migrate hero to new component`

### Task: Migrate Zhongwen Advantage Page Hero

- [ ] Write test to verify zhongwen-advantage page imports new hero component
- [ ] Remove old Hero component usage
- [ ] Add new Hero component with unified gradient
- [ ] Configure badge: variant="amber", text="Coming Soon"
- [ ] Add zhongwen-advantage logo image in title
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(zhongwen-advantage): Migrate hero to new component`

### Task: Migrate CodeCamp Advantage Page Hero

- [ ] Write test to verify codecamp-advantage page imports new hero component
- [ ] Remove old Hero component usage
- [ ] Add new Hero component with unified gradient
- [ ] Configure badge: variant="amber", text="Coming Soon"
- [ ] Add codecamp-advantage logo image in title
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(codecamp-advantage): Migrate hero to new component`

### Task: Migrate Storytime Advantage Page Hero

- [ ] Write test to verify storytime-advantage page imports new hero component
- [ ] Replace inline hero with new Hero component
- [ ] Configure props: height="medium", alignment="left"
- [ ] Configure floating image
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(storytime-advantage): Migrate hero to new component`

### Task: Migrate Primary Advantage Page Hero

- [ ] Write test to verify primary-advantage page imports new hero component
- [ ] Replace inline hero with new Hero component
- [ ] Configure props: height="medium", alignment="left"
- [ ] Configure floating image
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(primary-advantage): Migrate hero to new component`

### Task: Migrate Tutor Advantage Page Hero

- [ ] Write test to verify tutor-advantage page imports new hero component
- [ ] Replace inline hero with new Hero component
- [ ] Configure props: height="medium", alignment="left"
- [ ] Configure floating image
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(tutor-advantage): Migrate hero to new component`

### Task: Measure - User Manual Verification 'Phase 3: Page Migration Batch 2' (Protocol in workflow.md)

---

## Phase 4: Page Migration Batch 3 - Content Pages

### Task: Migrate About Page Hero

- [ ] Write test to verify about page imports new hero component
- [ ] Remove old Hero component usage
- [ ] Add new Hero component: height="medium", alignment="center"
- [ ] Configure CTA button linking to contact page
- [ ] Remove backgroundImage prop (use unified gradient)
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(about): Migrate hero to new component`

### Task: Migrate Features Page Hero

- [ ] Write test to verify features page imports new hero component
- [ ] Remove old Hero component usage
- [ ] Add new Hero component: height="medium", alignment="center"
- - Configure CTA button
- [ ] Remove backgroundImage prop (use unified gradient)
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(features): Migrate hero to new component`

### Task: Migrate Pricing Page Hero

- [ ] Write test to verify pricing page imports new hero component
- [ ] Remove old Hero component usage
- [ ] Add new Hero component: height="medium", alignment="center"
- [ ] Configure CTA button linking to contact page
- [ ] Remove backgroundImage prop (use unified gradient)
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(pricing): Migrate hero to new component`

### Task: Migrate Contact Page Hero

- [ ] Write test to verify contact page imports new hero component
- [ ] Replace inline hero with new Hero component
- [ ] Configure props: height="medium", alignment="center"
- [ ] Remove all inline hero code (gradient, container, etc.)
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(contact): Migrate hero to new component`

### Task: Measure - User Manual Verification 'Phase 4: Page Migration Batch 3' (Protocol in workflow.md)

---

## Phase 5: Page Migration Batch 4 - Service Detail Pages

### Task: Migrate Managed Service Page Hero

- [ ] Write test to verify managed-service page imports new hero component
- [ ] Replace inline hero with new Hero component
- [ ] Configure props: height="medium", alignment="left"
- [ ] Configure floating image with teacher-and-dashboard.png
- [ ] Configure badge: variant="amber", icon="Calendar"
- [ ] Configure CTA button (primary)
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(managed-service): Migrate hero to new component`

### Task: Migrate Blended Learning Page Hero

- [ ] Write test to verify blended-learning page imports new hero component
- [ ] Replace inline hero with new Hero component
- [ ] Configure props: height="medium", alignment="left"
- [ ] Configure floating image
- [ ] Configure CTA button
- [ ] Remove all inline hero code
- [ ] Verify visual match
- [ ] Run tests and confirm pass
- [ ] Commit with message: `refactor(blended-learning): Migrate hero to new component`

### Task: Measure - User Manual Verification 'Phase 5: Page Migration Batch 4' (Protocol in workflow.md)

---

## Phase 6: Cleanup and Verification

### Task: Remove Old Hero Component

- [ ] Verify no pages import `@/components/layout/hero.tsx`
- [ ] Delete `src/components/layout/hero.tsx`
- [ ] Run tests to confirm no breakage
- [ ] Commit with message: `chore(hero): Remove old hero component`

### Task: Run Build Verification

- [ ] Run `npm run build` with ignoreBuildErrors=false
- [ ] Verify zero TypeScript errors
- [ ] Verify build completes successfully
- [ ] Document any warnings
- [ ] Commit with message: `chore(verify): Run build verification`

### Task: Verify Unified Gradient Across Pages

- [ ] Manually inspect home page hero gradient
- [ ] Manually inspect products overview hero gradient
- [ ] Manually inspect services overview hero gradient
- [ ] Manually inspect product detail page hero gradients
- [ ] Manually inspect content page hero gradients
- [ ] Document any inconsistencies
- [ ] Commit with message: `chore(verify): Manual gradient verification`

### Task: Verify Hero Heights

- [ ] Verify home page uses height="tall"
- [ ] Verify all other pages use height="medium"
- [ ] Document any inconsistencies
- [ ] Commit with message: `chore(verify): Manual height verification`

### Task: Verify Mobile Responsiveness

- [ ] Test home page hero on mobile viewport
- [ ] Test products page hero on mobile viewport
- [ ] Test services page hero on mobile viewport
- [ ] Test reading-advantage page hero on mobile viewport
- [ ] Verify floating images hidden on mobile
- [ ] Verify CTA buttons stack properly
- [ ] Document any mobile issues
- [ ] Commit with message: `chore(verify): Mobile responsiveness verification`

### Task: Verify Accessibility Compliance

- [ ] Run Lighthouse audit on home page hero
- [ ] Verify all images have alt text
- [ ] Verify decorative elements have aria-hidden="true"
- [ ] Verify focus states work on CTAs
- [ ] Verify color contrast meets WCAG AA
- [ ] Document any a11y issues
- [ ] Commit with message: `chore(verify): Accessibility compliance check`

### Task: Measure - User Manual Verification 'Phase 6: Cleanup and Verification' (Protocol in workflow.md)
