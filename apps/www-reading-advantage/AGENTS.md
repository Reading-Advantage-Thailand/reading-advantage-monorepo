# AGENTS.md

## Measure Workflow

The root `AGENTS.md` section "Measure Workflow" applies to this app. Follow it.

## Subagent Usage
- **Front-end tasks**: Always use the `reading-advantage` subagent for all front-end development on this project.
- **General tasks**: Use `general` or `explore` subagents for non-front-end work as appropriate.

## Collaboration Principles
1. **Spec-first**: No code without an approved spec update (or at minimum a documented delta).
2. **Single Source of Truth**: `docs/` governs decisions; `todo.md` only tracks residual items awaiting specs.
3. **Tight Feedback Loops**: Use GitHub issue comments and PR reviews; summarize decisions in docs.
4. **Automation Friendly**: Keep commands/test scripts runnable locally and in CI/CD.

## Expectations for Contributions
- Reference relevant spec + issue in commit messages and PR description.
- Update docs when behavior changes or new decisions are made.
- Include testing notes in PRs (commands run, results, screenshots if UI).
- Keep branch naming consistent (`feat/<issue>-description`, `fix/<issue>-description`).

## Design rules

Before UI work, read `docs/design-rules.md`. After changes, run `pnpm --filter www-reading-advantage lint`
and fix every `shadcn/*` error in the files you touched.
