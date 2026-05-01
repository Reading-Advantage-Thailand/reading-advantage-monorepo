# Science Advantage Product Definition

## Product Thesis

Science Advantage is a web-first science learning platform for Thai-aligned
school delivery inside the broader Advantage ecosystem. The product wins when it
helps teachers deliver structured science curriculum, helps students move
through lessons and assessments with bilingual support, and turns performance
data into clear mastery and intervention signals.

## Primary Users

- **Students**: complete lessons, labs, quizzes, and review activities inside a
  class context.
- **Teachers**: create and manage classes, monitor progress, preview curriculum,
  and act on intervention signals.
- **School administrators**: configure access, monitor rollout, and validate
  curriculum readiness.

## Product Scope for the Replan

The active planning scope is narrower and more concrete than the older PRD:

- Thai standards-aligned science curriculum as the product core
- Grade 3 scope-and-sequence as the baseline curriculum operating model
- Grade 4 structured content as the first scalable rich-content expansion
- Web delivery for teacher and student workflows before mobile or parent
  surfaces
- AI used as assistive infrastructure for recommendations, content operations,
  and teacher signal quality rather than as the main product surface

## Core User Outcomes

### Students

- Open the right lesson for their class without friction
- Read rich, age-appropriate science content with Thai scaffolding where needed
- Complete quizzes and lesson activities with immediate feedback
- Understand what to do next based on mastery and recommendation signals

### Teachers

- Stand up a class quickly and assign the correct curriculum path
- See class, lesson, and student progress without stitching together reports
- Identify who is struggling and why from mastery-aligned signals
- Preview lesson quality before assigning it

### Administrators

- Confirm the platform is using the approved curriculum model
- Roll out new content without unstable manual processes
- Trust the product's access model and production security posture

## Curriculum Strategy

The curriculum model should follow the most grounded planning artifacts already
in the repository:

- Grade 3 scope-and-sequence defines the teaching rhythm
- Lesson types are explicit instruction, lab, fun review, and summative
  assessment
- Formative assessment is embedded in each lesson flow
- Content is stored as structured JSON blocks rather than freeform HTML
- Bilingual scaffolding is content-aware, not bolted on at the page level
- Standards alignment and question mapping are first-class data relationships

## Product Priorities

1. **Curriculum foundation**: one trusted source of truth for standards, units,
   lessons, questions, and media.
2. **Student learning loop**: lesson delivery, quiz completion, progress, and
   next-step guidance must feel coherent.
3. **Teacher visibility**: teachers need assignment, preview, analytics, and
   intervention surfaces that map directly to the curriculum.
4. **Platform alignment**: auth, caching, storage, and test infrastructure must
   match the declared stack and repo constraints.
5. **Assistive AI**: recommendations and generated assets should improve the
   workflow without becoming a dependency for basic product function.

## Near-Term Release Definition

The next credible release should include:

- a stable access model aligned with the repo's auth contract
- canonical curriculum data for Grade 3 and Grade 4
- a complete student lesson -> quiz -> mastery loop
- teacher tools for assigning, previewing, and reviewing curriculum delivery
- observable recommendation and intervention services with deterministic
  fallbacks

## Explicit Non-Goals for This Planning Cycle

- native iOS or Android applications
- parent portal delivery
- live tutoring
- AR/VR labs
- LMS/SIS integrations beyond what is needed to preserve future compatibility
- broad multi-country positioning that is not backed by the current curriculum
  and workflow model
