# Specification: Create Unified App Directory Page

## Overview

The company website has no central directory or login page that helps users navigate between the different applications (reading-advantage, primary-advantage, science-advantage, codecamp-advantage, advantage-games). This track creates a unified app directory page that explains each product, who it's for, and how to access it.

## Current State

- No central app directory exists
- Each product page is isolated
- No way for users to understand which app is right for them
- CTAs go to mailto: or /contact instead of actual apps
- No unified login experience

## Functional Requirements

### FR-1: Create App Directory Page
- URL: `/apps` or `/products`
- Hero: "Reading Advantage Platform" with subtitle explaining the ecosystem
- Grid of app cards showing all 5 products

### FR-2: App Cards
Each card includes:
- App name and logo/icon
- Color-coded theme (sky, cyan, rose, slate, purple)
- Target audience badge (Students K-3, Grades 3-6, Middle/High School, Teachers, Admins, Interns)
- One-line description
- Key features (3-4 bullet points)
- "Learn More" link to product page
- "Open App" link (when applicable)
- Status badge (Live, Early Access, etc.)

### FR-3: Role-Based Navigation
- Section: "I'm a..." with role selector
- Student → Show reading, primary, science, games
- Teacher → Show reading, primary, science (teacher portals)
- School Admin → Show all apps with admin access info
- Parent → Show reading, primary, games
- Intern/Coding Student → Show CodeCamp

### FR-4: Getting Started Flow
- Step 1: Choose your role
- Step 2: Select your product
- Step 3: Contact sales or request demo
- Include CTA: "Contact Sales for School Licenses"

### FR-5: Technical Requirements Info
- Browser requirements
- Device support (desktop, tablet, mobile)
- Integration info (Google Classroom, SSO)
- Mention shared auth system across apps

## Non-Functional Requirements

### NFR-1: Consistent Design
- Use neutral/brand color scheme (warm cream with sky-500 accents)
- Follow existing card and layout patterns
- Maintain clay-inspired design

### NFR-2: i18n Support
- Full EN, TH, ZH translations
- Role names and audience descriptions localized

### NFR-3: SEO
- Proper metadata and OpenGraph tags
- Structured data for software applications

### NFR-4: Build Verification
- Page builds successfully
- No lint errors

## Acceptance Criteria

1. App directory page exists at `/apps` or `/products`
2. All 5 products represented with accurate info
3. Role-based filtering works (client-side)
4. Each card links to correct product page
5. All three locale versions available
6. Build passes without errors
7. Mobile responsive
8. SEO metadata properly set

## Out of Scope

- Implementing actual SSO/login functionality
- Backend user management
- Dynamic app status from health checks
- Embedded app previews
