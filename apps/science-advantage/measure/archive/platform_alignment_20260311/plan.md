# Implementation Plan

## Phase 1: Authentication Contract

- [x] Task: Define failing tests for the Google OAuth plus dev impersonation contract
  - [x] Write unit/integration tests that codify production-only Google OAuth and local impersonation behavior
  - [x] Confirm the current credential-based flow fails the new contract
- [x] Task: Replace the user-facing credential login flow
  - [x] Implement the declared sign-in experience and session handling
  - [x] Remove or quarantine demo credential UX from production paths
- [x] Task: Centralize auth and role routing
  - [x] Consolidate role constants, redirects, and route guards into shared helpers
  - [x] Refactor protected routes to consume the shared auth layer
- [x] Task: Measure - Manual Verification 'Authentication Contract'
  - [x] Verify Google sign-in, redirect behavior, and dev impersonation locally

## Phase 2: Shared Platform Services

- [x] Task: Define failing tests for config, cache, and rate-limit adapters
  - [x] Cover Redis-backed and fallback behavior for shared-state services
  - [x] Cover stale-session cleanup behavior
- [x] Task: Implement environment and service adapters
  - [x] Align env parsing with auth, AI, Redis, and storage requirements
  - [x] Introduce reusable cache/rate-limit interfaces with safe fallbacks
- [x] Task: Add browser-level smoke coverage
  - [x] Replace the placeholder E2E command with a real harness
  - [x] Cover sign-in, student entry, and teacher entry smoke flows
- [x] Task: Measure - Manual Verification 'Shared Platform Services'
  - [x] Verify auth, cache fallback, and browser smoke setup in a local QA run

## Phase 3: Documentation Alignment

- [x] Task: Update operator and developer docs
  - [x] Align README and environment guidance with the implemented platform contract
  - [x] Record remaining platform debt in `measure/tech-debt.md`
- [x] Task: Measure - Manual Verification 'Platform Documentation'
  - [x] Verify setup instructions and smoke commands are executable end to end
