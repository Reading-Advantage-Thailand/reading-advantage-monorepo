# Implementation Plan: Cold-Start Performance

## Phase 1: Profiling & Root Cause (P0)

- [ ] Task: Profile the cold-start path
  - [ ] Measure container startup time (image pull + Node.js boot + Next.js init)
  - [ ] Identify the dominant cost: image size, dependency loading, or initialization

## Phase 2: Optimization (P0)

- [ ] Task: Reduce cold-start time
  - [ ] Evaluate Cloud Run `min-instances` configuration to keep at least 1 instance warm
  - [ ] Evaluate image-size reduction (multi-stage Docker build, tree-shaking)
  - [ ] Evaluate Next.js startup hooks or lazy initialization

## Phase 3: Verification (P0)

- [ ] Task: Re-run Phase 1/6 cold-start probes
  - [ ] Cold-start < 5s passes on prod
  - [ ] No warm-request latency regression
