---
title: Core Science Curriculum & Content Management Spec
type: spec
status: draft
created_at: 2025-11-29
tags: [spec, curriculum, content-management, cms, standards]
description: Technical specification for managing standards-aligned science curriculum, lesson templates, and bilingual content delivery.
---

# Core Science Curriculum & Content Management Spec

## Capability Summary

Deliver standards-aligned science curriculum content to students and teachers while
enabling rapid authoring, review, and publishing of new or updated lessons.

## Key References

- PRD Epic 2: Core Science Curriculum & Content Management  
  (`docs/prd/epic-2-core-science-curriculum-content-management.md`)
- Project Brief: Curriculum strategy (`docs/project-brief/market-analysis.md`)

## Functional Requirements

- **CSCM-FR1 (PRD FR1)**  
  Provide complete Thai Ministry of Education aligned curriculum for Prathom 1-6
  and Matthayom 1-6, organized by grade, term, and unit. Teachers and students must
  be able to browse, filter, and launch lessons appropriate to their cohort.

- **CSCM-FR2 (PRD FR2)**  
  Offer at least 50 interactive virtual lab experiences mapped to curriculum units.
  Each lab must expose learning objectives, safety notes, and track completion
  status per student.

- **CSCM-FR3 (PRD FR15)**  
  Support curriculum operations staff in drafting, reviewing, and publishing lesson
  content with version history, scheduled release windows, and rollback capability.

- **CSCM-FR4 (PRD FR5, FR11)**  
  Surface cross-subject reading recommendations and gamified progression cues that
  connect content modules to the ecosystem skill tree.

## Non-Functional Requirements

- **CSCM-NFR1 (PRD NFR2)**  
  Lesson detail pages must render in under 2 seconds for 95% of requests on target
  devices.

- **CSCM-NFR2 (PRD NFR10)**  
  Content presentation must comply with WCAG AA accessibility guidelines, including
  support for screen readers and high-contrast themes.

## Scenarios

### Teacher Launches Assigned Lesson
1. Teacher opens the class dashboard and selects a class.
2. The system lists lessons filtered to the class grade and term.
3. Teacher launches a lesson; the lesson loads with objectives, readings, and
   optional lab activities.
4. Completion and engagement metrics stream back to the teacher dashboard.

### Content Editor Publishes Updated Lab
1. Content editor drafts revisions to a lab, attaching updated instructions and
   assets.
2. Editor submits the draft for review; reviewer approves the changes.
3. Editor schedules the publish date and confirms rollout.
4. The platform records version metadata and deploys the update at the scheduled
   time with rollback available.

### Developer Imports Curriculum Content
1. Developer creates JSON files for new curriculum content (standards, lessons, units)
2. Developer runs seed script to import content into database
3. The system validates JSON structure and creates database records
4. Content becomes available to teachers and students immediately

### Developer Migrates Content Schema
1. Database schema changes requiring content updates
2. Developer runs migration script to update JSON files
3. Migration script creates backups before modifying files
4. Developer reviews changes and commits updated JSON files

## Content Management

### Requirement: Support Scalable Content Import
The system SHALL support importing curriculum content from structured JSON files organized by framework and grade level.

**Scenario: Import Curriculum Content**
- **WHEN** curriculum content is added or updated in JSON files
- **THEN** the seed script imports the content and creates/updates database records with proper relationships

### Requirement: Schema Migration for Content
The system SHALL provide migration scripts that update content files when database schema changes.

**Scenario: Schema Change Affects Content**
- **WHEN** database schema adds/removes fields that affect content (lessons, questions, standards)
- **THEN** a migration script updates all JSON files to match new schema with sensible defaults
- **AND** backup files are created before any modifications

### Requirement: Content Validation
The system SHALL validate JSON content structure before importing into the database.

**Scenario: Invalid Content Detected**
- **WHEN** JSON content violates required schema (missing fields, incorrect types)
- **THEN** the seed process reports validation errors and halts
- **AND** error messages indicate the specific file and field causing the issue

### Requirement: Selective Content Import
The system SHALL support importing specific subsets of content by framework and grade level.

**Scenario: Import Single Grade**
- **WHEN** developer specifies framework and grade filters
- **THEN** only content matching those filters is imported
- **AND** other content remains unchanged

## Interactive Lesson Content Delivery

### Requirement: Support Different Lesson Types
The system SHALL support distinct templates for different types of lessons, including but not limited to instructional lessons, labs, and assessments.

**Scenario: Render a Lab Lesson**
- **WHEN** a student views a lesson of type "LAB"
- **THEN** the system MUST render interactive components specific to labs, such as a procedure checklist and a materials list

**Scenario: Render a Regular Lesson**
- **WHEN** a student views a lesson of type "LESSON"
- **THEN** the system MUST render interactive components for vocabulary flashcards and reading passages

### Requirement: Deliver Grade-Appropriate Instructional Content
The system SHALL provide complete lesson content that is developmentally appropriate for the target grade level.

**Scenario: Student Reads Lesson Content**
- **WHEN** a student opens a lesson
- **THEN** the content is appropriate for their grade level, engaging, and aligned with curriculum standards

### Requirement: Include Reading Comprehension Passages
The system SHALL include reading passages within lessons to support cross-subject learning (science + reading).

**Scenario: Lesson Contains Reading Passage**
- **WHEN** a lesson includes instructional content
- **THEN** it contains a reading passage of appropriate length (300-500 words for Grade 3) that can support comprehension questions

### Requirement: Define Key Vocabulary in Context
The system SHALL present key scientific vocabulary with definitions and contextual usage in a structured format.

**Scenario: Student Encounters Vocabulary**
- **WHEN** a student reads lesson content
- **THEN** key vocabulary terms are presented in a structured format (`- **Term** (Thai: translation) - Definition`) to enable interactive components
- **AND** vocabulary includes 8-12 terms per lesson with clear, grade-appropriate definitions
- **AND** all vocabulary terms MUST include Thai translations

**Scenario: Interactive Vocabulary Display**
- **WHEN** a student views lesson vocabulary
- **THEN** the system SHALL parse structured vocabulary entries and render them as interactive flashcards
- **AND** flashcards SHALL display the English term, Thai translation, and definition

## Open Questions

- Define the minimum viable toolset for authoring (in-app editor vs. external CMS).
- Confirm localization requirements for bilingual content in early releases.
