# Specification: Update CodeCamp Advantage Product Page

## Overview

The CodeCamp Advantage product page (`/products/codecamp-advantage`) currently displays "Coming Soon" with basic information about coding tracks. However, the actual `apps/codecamp-advantage` application is fully deployed with a phased curriculum (18+ modules), AI chat tutor, GitHub PR review automation, and intern management. This track updates the marketing page to accurately reflect the implemented platform.

## Current State

- Page shows: "Coming Soon", basic track descriptions (Next.js, MERN, Django)
- Missing: Actual curriculum details, AI tutor info, GitHub integration, admin features

## Actual Implementation (from apps/codecamp-advantage)

### Phased Curriculum
- 4 phases (A, B, C, D) covering 18+ modules
- Modules: Dev Environment, Git/GitHub, HTML/CSS, JavaScript, TypeScript, Vitest Testing, React, Next.js, API Design, Database/ORM, tRPC/Server Actions, Auth, i18n, AI Integration, Monorepo, Cloud/Docker, Real-World Practice
- Portfolio projects per phase
- Progress tracking with locked modules and prerequisites

### Learning Experience
- Module detail pages with lessons
- Interactive exercises with automated evaluation
- Quiz submission with answer validation
- AI chat tutor with streaming responses and conversation history

### GitHub Integration
- Fork-based exercise workflow
- GitHub App webhook for PR events
- Automated LLM code review via OpenRouter
- PR review status tracking

### Admin & Management
- Admin dashboard for intern account creation
- Intern list and detailed progress tracking
- Phase-grouped curriculum queries

## Functional Requirements

### FR-1: Update Hero Section
- Change "Coming Soon" to "Now Enrolling" or "Active Bootcamp"
- Update CTA to "Apply Now" or "View Curriculum"
- Add badge: "Full-Stack Web Development Internship"

### FR-2: Add Curriculum Showcase
- Display 4 phases with module breakdown
- Show progression path (A → B → C → D)
- Highlight portfolio projects
- Include module count (18+) and lesson count

### FR-3: Add Feature Sections
- AI Chat Tutor: 24/7 coding assistant with conversation history
- GitHub Integration: Fork exercises, automated PR review
- Exercise Evaluation: Automated testing and feedback
- Progress Tracking: Phase completion, locked modules, prerequisites

### FR-4: Add Screenshots/Demo
- Dashboard showing phased curriculum
- AI chat tutor interface
- GitHub PR review workflow
- Exercise completion screen

### FR-5: Update Access Info
- Remove "Coming Soon" messaging
- Add application/enrollment CTA
- Reference intern bootcamp program

## Non-Functional Requirements

### NFR-1: Consistent Design
- Maintain slate/amber theme
- Follow existing product page layout patterns
- Use clay-inspired design tokens

### NFR-2: i18n Support
- Update EN, TH, and ZH locale files
- Thai is primary locale for this product

### NFR-3: Build Verification
- Page must build successfully
- No new lint errors

## Acceptance Criteria

1. CodeCamp Advantage page no longer shows "Coming Soon"
2. Page accurately describes the 18+ module curriculum
3. AI tutor and GitHub integration features are highlighted
4. Screenshots from actual app are included
5. All three locale versions updated
6. Build passes without errors
7. Mobile responsive layout maintained

## Out of Scope

- Implementing actual enrollment system on marketing site
- Embedding live curriculum browser
- Changes to actual codecamp-advantage app
