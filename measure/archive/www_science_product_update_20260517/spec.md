# Specification: Update Science Advantage Product Page

## Overview

The Science Advantage product page (`/products/science-advantage`) currently displays "Coming 2025" with a waitlist signup form. However, the actual `apps/science-advantage` application is functional with multi-role dashboards, class management, lesson delivery, quizzes, and AI-driven recommendations. This track updates the marketing page to accurately reflect the implemented features.

## Current State

- Page shows: "Coming 2025", waitlist email form, basic NGSS alignment mention
- Missing: Actual feature descriptions, screenshots, teacher/student portal info, AI recommendations

## Actual Implementation (from apps/science-advantage)

### Student Features
- Join classes via 6-character code
- View enrolled classes and lesson lists  
- Interactive quizzes integrated into lessons
- Gamification dashboard with progress tracking
- Profile and settings management

### Teacher Features
- Intervention alerts widget for at-risk students
- Class management: roster, analytics, lesson previews
- Per-student lesson analytics with detailed progress
- Class-level lesson analytics and reporting

### Admin & System
- Admin overview, student/teacher lists
- System admin schools management
- Curriculum management per class

### AI & Assessment
- AI-powered recommendations based on mastery profiles
- Student mastery tracking with standard alignment
- Automated mastery updates
- Lesson progress and analytics endpoints

## Functional Requirements

### FR-1: Update Hero Section
- Change "Coming 2025" to "Now Available" or "Early Access"
- Update CTA from waitlist to "Explore Platform" or "Request Demo"
- Add badge: "NGSS-Aligned K-12 Science Curriculum"

### FR-2: Add Feature Sections
- Student Experience: Class joining, lesson delivery, interactive quizzes
- Teacher Tools: Intervention alerts, analytics dashboard, class management
- AI-Powered Learning: Adaptive recommendations, mastery tracking
- Standards Alignment: NGSS mapping, progress monitoring

### FR-3: Add Screenshots/Demo
- Include actual screenshots from science-advantage app
- Show teacher dashboard with intervention alerts
- Show student lesson view with quiz integration
- Show class analytics view

### FR-4: Update Pricing/Access Info
- Remove waitlist-only messaging
- Add "Contact Sales for School Licenses" or similar
- Reference actual licensing system (shared auth)

### FR-5: Add Role-Based CTAs
- "For Students" - Join a class, explore lessons
- "For Teachers" - Set up your classroom, view analytics
- "For Schools" - Admin setup, curriculum management

## Non-Functional Requirements

### NFR-1: Consistent Design
- Maintain rose theme (#e11d48 / rose-600)
- Follow existing product page layout patterns
- Use clay-inspired design tokens (warm cream, oat borders)

### NFR-2: i18n Support
- Update EN, TH, and ZH locale files
- Ensure all new copy is translatable

### NFR-3: Build Verification
- Page must build successfully
- No new lint errors

## Acceptance Criteria

1. Science Advantage page no longer shows "Coming 2025"
2. Page accurately describes implemented student, teacher, and admin features
3. Screenshots or demo imagery from actual app are included
4. CTAs reflect actual platform availability
5. All three locale versions (EN, TH, ZH) updated
6. Build passes without errors
7. Mobile responsive layout maintained

## Out of Scope

- Implementing actual login/auth on marketing site
- Embedding live app iframe
- Creating new backend APIs
- Changes to actual science-advantage app
