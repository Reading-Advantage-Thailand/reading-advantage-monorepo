# Unit 16 Overview: Measure-Driven AI Development

**Phase:** D (Production)
**Periods:** 3
**Portfolio Project:** Student Progress Tracker (AI-assisted feature delivery)

## Learning Objectives

By the end of this unit, the intern can:

1. Explain why AI coding agents need explicit project context, specifications, and plans
2. Identify the purpose of core Measure artifacts: `product.md`, `tech-stack.md`, `workflow.md`, `tracks.md`, `spec.md`, and `plan.md`
3. Turn a small feature request into a scoped Measure track with acceptance criteria
4. Write a phased implementation plan that includes Red, Green, review, and acceptance evidence
5. Use an AI assistant against a plan without letting the implementation drift from the spec
6. Record practical project memory in `lessons-learned.md` and known shortcuts in `tech-debt.md`

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| Measure | Local repo workflow | Spec-driven AI development methodology |
| Git | Latest stable | Track implementation evidence and PR history |
| Vitest | 4.1.5 | Red/Green proof for the mini-feature |
| AI coding assistant | Instructor-approved | Implement against explicit context and plan |

## Portfolio Connection

The intern uses Measure to deliver a small improvement to their Student Progress Tracker. The goal is not to learn a new framework API; the goal is to control AI-assisted implementation with clear context, scoped requirements, tests, review evidence, and a concise closeout.

Example mini-feature options:

- Add a dashboard empty state for students with no progress yet
- Add a formatted "last active" label to the student profile
- Add validation messaging for a quiz retake form
- Add a small helper that calculates module completion status

## Key Concepts

- **Context before code**: AI agents should read project context before editing
- **Track**: One logical unit of work with a spec and plan
- **Spec**: Requirements, acceptance criteria, non-goals, and constraints
- **Plan**: Source of truth for phased execution and task status
- **Red/Green/Review/Acceptance**: Evidence-backed delivery lifecycle
- **Project memory**: Lessons learned and tech debt prevent repeated mistakes

## Architecture Mirroring

This unit mirrors the workflow used in the Reading Advantage monorepo:

- Work starts from a Measure track instead of an unstructured prompt
- New behavior is described in `spec.md` before implementation
- Tasks are executed from `plan.md` in sequence
- Tests prove behavior before a task is marked complete
- Review focuses on correctness, security, UX/API contract, and acceptance evidence
- Known shortcuts are logged instead of hidden

## Prerequisites

- Units 01–15 complete (AI Integration)
- Intern can write basic Vitest tests and open a GitHub PR

## Assessment

- Exercise repo: Complete one small feature using a Measure-style track, spec, plan, Red/Green proof, PR description, and closeout summary
- No quiz — the track artifacts and PR are the assessment
