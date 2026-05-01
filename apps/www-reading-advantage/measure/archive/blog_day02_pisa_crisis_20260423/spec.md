# Specification: Day 2 Blog Post — The PISA Crisis

## Overview

Create the Day 2 blog post for the 30-Day "Advantage" Blog Marketing Campaign. This post analyzes Thailand's declining PISA scores and positions Reading Advantage as the solution to the reading comprehension crisis that underlies poor math performance.

## Functional Requirements

### Content Requirements
1. **English Version**: Complete markdown blog post with frontmatter
   - Title: "The PISA Crisis: Why Reading is a Math Problem"
   - Date: 2026-04-23
   - Excerpt: Analyzing why Thai PISA scores are dropping and how functional literacy is the key
   - Cover image: `/blog/day02-pisa-crisis_001.jpg`
   - Author: "Reading Advantage Marketing Team"
   - Product focus: `/products/reading-advantage`
   - Tags: PISA, Thai Education, Reading Comprehension, Math Performance, Literacy Crisis
   - Reading time: ~7 minutes

2. **Thai Version**: Complete Thai translation of the blog post
   - Title: "วิกฤต PISA: ทำไมการอ่านถึงเป็นปัญหาของคณิตศาสตร์"
   - Same metadata structure as English version
   - Culturally appropriate translation maintaining persuasive tone

### Technical Requirements
1. Files must be placed in:
   - EN: `src/app/[locale]/(marketing)/blog/posts/en/the-pisa-crisis.md`
   - TH: `src/app/[locale]/(marketing)/blog/posts/th/the-pisa-crisis.md`

2. Must follow existing blog post frontmatter format
3. Must use proper markdown formatting (headers, lists, tables, bold/italic)
4. Must include product CTA linking to Reading Advantage

## Non-Functional Requirements

- **Tone**: Authoritative but accessible, data-driven but empathetic
- **Length**: ~1,500-2,000 words per language
- **SEO**: Include relevant keywords naturally (PISA, Thailand education, reading comprehension, math scores)
- **Accessibility**: Proper heading hierarchy (H1 → H2 → H3)

## Acceptance Criteria

- [ ] English blog post file exists with complete content
- [ ] Thai blog post file exists with complete content
- [ ] Both files have valid frontmatter
- [ ] Content covers: PISA data, reading-math connection, Thai education context, parent tips, Reading Advantage CTA
- [ ] Both posts follow the same structure and messaging
- [ ] No hardcoded strings (content is in markdown files, not components)
- [ ] Images referenced exist in `/public/blog/`

## Out of Scope

- Creating new blog components
- Modifying blog listing page
- Adding pagination or related posts logic
- SEO metadata beyond frontmatter
- Social media sharing images
