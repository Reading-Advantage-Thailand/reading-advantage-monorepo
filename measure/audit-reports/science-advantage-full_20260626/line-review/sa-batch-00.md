# Line Review: sa-batch-00

- **Track:** `science_advantage_review_20260626`
- **Batch:** 00 (20 files)
- **Reviewer focus:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns
- **Scope:** Configuration, documentation, templates, meta-files (no app code)
- **Date:** 2026-06-27

---

## File-by-File Review

### F1: `apps/science-advantage/.codex/skills/conductor.skill`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Binary Zip archive (not human-readable) |

**Findings:**

1. **F-SA-B00-001 [unreviewable]** — This file is stored as a Zip archive committed to git. Its contents cannot be reviewed as text. A `.skill` file is expected to contain structured instructions for an AI agent; being a binary blob prevents audit of correctness, security posture, or alignment with Measure workflow. **Severity: medium** — consider storing as plaintext YAML/JSON with `.skill.yaml` extension.

---

### F2: `apps/science-advantage/.env.example`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Mostly sound |
| **Security** | Good — uses placeholder values, no secrets |
| **AGENTS.md compliance** | Some provider-specific model names leak into env vars |

| Line | Finding |
|------|---------|
| 6 | `DATABASE_URL` references port 6432 (PgBouncer pooled) and `DIRECT_DATABASE_URL` references port 5432 (direct). Good — documents connection pooling architecture. |
| 7 | Comment references `packages/db/src/connection-options.ts` — verified this file exists. ✓ |
| 16 | `OPENAI_API_KEY` — OpenKey key name is provider-specific. Monorepo AGENTS.md mandates AI through an internal adapter layer (`ai.generateText()` etc.). If the _code_ routes through an adapter, the env var name is a cosmetic deviation; if code uses the OpenAI SDK directly, this is an adapter bypass. This review batch cannot verify call sites. **Severity: low** — flag for call-site audit. |
| 20 | `AI_RECOMMENDER_MODEL` — model names hardcoded as `gpt-5-mini` and `gemini-2.5-flash`. Model selection in env vars couples config to provider inventory; prefer abstract capability tiers (e.g. `AI_MODEL_FAST`, `AI_MODEL_PREMIUM`). **Severity: low** — architectural preference. |
| 30–32 | `AI_IMAGE_PRIMARY_MODEL`, `AI_IMAGE_FALLBACK_MODELS` — same model-name coupling as line 20. |
| 37–44 | S3-compatible storage: references `@reading-advantage/storage` adapter — good AGENTS.md alignment. ✓ |
| 46–51 | OpenTelemetry: documented with console-exporter fallback for dev — good. ✓ |
| 53–56 | Sentry DSN left empty in example — correct pattern. ✓ |
| 60–62 | Feature flags via `NEXT_PUBLIC_*` — standard Next.js pattern. ✓ |

---

### F3: `apps/science-advantage/.github/ISSUE_TEMPLATE/bug.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound template |
| **AGENTS.md compliance** | Aligns with spec-driven workflow |

| Line | Finding |
|------|---------|
| 14–17 | References `docs/specs/[capability]/spec.md` — good, enforces spec-first culture. ✓ |
| 22–23 | Has Expected/Actual Behavior sections — structured and clear. ✓ |
| 35 | Environment section covers OS/Node/branch — adequate. |

No material findings. ✓

---

### F4: `apps/science-advantage/.github/ISSUE_TEMPLATE/config.yml`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minimal, valid |

2 lines, blank issues enabled. No findings. ✓

---

### F5: `apps/science-advantage/.github/ISSUE_TEMPLATE/feature.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound template |
| **AGENTS.md compliance** | Good spec-first alignment |

| Line | Finding |
|------|---------|
| 15 | References spec docs — good. ✓ |
| 30–37 | Acceptance criteria and test plan sections — good for TDD culture. ✓ |
| 41 | "Spec updated in docs/specs/" in the implementation checklist — enforces Measure workflow. ✓ |

No material findings. ✓

---

### F6: `apps/science-advantage/.github/ISSUE_TEMPLATE/story-with-agents.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Contains references to a legacy process |
| **AGENTS.md compliance** | **Minor deviation** — BMAD agent roles are not referenced in the monorepo root AGENTS.md |

| Line | Finding |
|------|---------|
| 24–37 | **F-SA-B00-002 [legacy-process]** — References "BMAD Agent Assignments" (dev/James, architect/Winston, QA/Quinn, UX/Sally, PO/Sarah, SM/Bob). This is a legacy multi-agent framework. The monorepo AGENTS.md references Measure tracks and Conductor, not BMAD. This template may mislead agents or contributors into using an outdated process. **Severity: low** — document as legacy template; consider deprecating in favor of the simpler `story.md` or `feature.md` templates. |
| 20–22 | Test Plan section exists — good. ✓ |

---

### F7: `apps/science-advantage/.github/ISSUE_TEMPLATE/story.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Detailed and structured, but contains outdated references |
| **AGENTS.md compliance** | **Minor deviation** — references Prisma and npm |

| Line | Finding |
|------|---------|
| 12 | Label example includes `area:prisma` — Prisma has been replaced by Drizzle per the monorepo AGENTS.md and the regression guard in `apps/science-advantage/AGENTS.md`. **F-SA-B00-003 [outdated-ref]** — should be `area:drizzle` or `area:db`. **Severity: low**. |
| 12 | Label includes `area:auth` — acceptable as a general category. |
| 74 | References `npm run db:seed` — the app uses `pnpm`, not `npm`. **F-SA-B00-004 [tool-mismatch]** — should reference `pnpm seed` (from AGENTS.md line 36). **Severity: low**. |
| 98 | "Example Code/Schema" suggests Prisma schema examples — should reference Drizzle schema examples instead. **F-SA-B00-005 [outdated-ref]**. **Severity: low**. |

---

### F8: `apps/science-advantage/.github/ISSUE_TEMPLATE/task.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Same Prisma/npm legacy references as story.md |
| **AGENTS.md compliance** | **Minor deviation** |

| Line | Finding |
|------|---------|
| 12 | Label example includes `area:prisma` — same issue as F7. **F-SA-B00-006 [outdated-ref]**. **Severity: low**. |
| 93–95 | "Example Implementation" section with Prisma schema examples — same issue. **F-SA-B00-007 [outdated-ref]**. **Severity: low**. |

---

### F9: `apps/science-advantage/.github/pull_request_template.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound, well-structured |
| **AGENTS.md compliance** | Good alignment |

| Line | Finding |
|------|---------|
| 6–8 | Spec deltas section (ADDED/MODIFIED/REMOVED Requirements) — excellent spec-first alignment. ✓ |
| 20–24 | Testing checklist covers unit, integration, E2E, linting, build. ✓ |
| 30 | "Specs updated in docs/specs/" — enforces documentation discipline. ✓ |
| 39–41 | Migration guide section for breaking changes — good practice. ✓ |

No material findings. ✓

---

### F10: `apps/science-advantage/.gitignore`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Mostly sound; one anomaly |

| Line | Finding |
|------|---------|
| 17–23 | `.env*` pattern correctly protects all env files while allowing `.env.example` and `.env.test`. ✓ |
| 54–57 | Prisma-related ignores (`prisma/*.db`, `prisma/*.sqlite`, etc.) — leftover from Prisma era. Drizzle uses `packages/db/drizzle/` for migrations. These lines are harmless clutter but should be cleaned up. **F-SA-B00-008 [legacy-clutter]**. **Severity: informational**. |
| 63 | `.claude/` — ignores the local Claude directory. Reviewed and intentional. ✓ |
| 66 | `.bmad-core/`, `.bmad-*/` — BMAD legacy ignores. Harmless. |
| 68 | **F-SA-B00-009 [gitignore-bug]** — Entry `\n.tmp/` (literal backslash-n, confirmed via hexdump: `5c6e 2e74 6d70 2f`). This will never match `.tmp/` or `tmp/` in practice — the backslash-n is treated as a literal path component. Probably intended as `.tmp/` or `tmp/`. **Severity: low** — trivial but could let temp files escape tracking. |

---

### F11: `apps/science-advantage/.opencode/mcp.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Valid JSON structure |
| **Security** | **Supply chain risk** |

| Line | Finding |
|------|---------|
| 6–8 | `@jpisnice/shadcn-ui-mcp-server` via `npx` — third-party MCP server. Acceptable for dev tooling, but an external dependency. |
| 11–12 | `chrome-devtools-mcp@**latest**` — uses the `@latest` npm tag with `npx -y`. **F-SA-B00-010 [supply-chain-risk]** — the `-y` flag suppresses the confirmation prompt, and `@latest` means any future publish (including malicious) is pulled automatically. Pin to a specific semver range. **Severity: medium**. |

---

### F12: `apps/science-advantage/.opencode/opencode.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | **JSON syntax issue** |

| Line | Finding |
|------|---------|
| 1 | Trailing comma after the object property before closing brace: `"$schema": "https://opencode.ai/config.json",}`. **F-SA-B00-011 [json-syntax]** — technically invalid JSON (trailing comma inside the object literal). If the parser is strict, this will fail. If the parser is lenient (JSON5/JSONC), it may be tolerated. **Severity: low** — fix to remove the comma. |

---

### F13: `apps/science-advantage/.prettierignore`

Standard ignores (node_modules, .next, out, dist, build, public). No findings. ✓

---

### F14: `apps/science-advantage/.prettierrc`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Standard Prettier config |
| **AGENTS.md compliance** | Matches the coding style described in AGENTS.md (2-space, single quotes, semicolons). ✓ |

No findings. ✓

---

### F15: `apps/science-advantage/AGENTS.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Well-maintained, documents deviations transparently |
| **AGENTS.md compliance** | Good alignment with monorepo root |

| Line | Finding |
|------|---------|
| 3 | Regression guard about `prisma/` directory — verified absent. ✓ |
| 7 | Documents caret-range dependency deviation — transparent about grandfathered tech debt. Good. ✓ |
| 32 | References `.claude/skills/doc-indexer/scripts/scan-docs.sh` — verified this script exists. ✓ |
| 36 | Uses `pnpm` commands — consistent with monorepo. ✓ |
| 44–45 | Testing guidelines reference Drizzle, Vitest — consistent with monorepo. ✓ |
| 48–74 | Local test database setup with Drizzle — thorough and well-documented. ✓ |
| 78 | Conventional Commits guidance. ✓ |
| 85–90 | Auth: username/password via `@reading-advantage/auth`, dev impersonation — aligns with monorepo auth philosophy. ✓ |
| No multi-tenancy / schoolId scoping section | This is an app-level AGENTS.md that documents deviations; the monorepo root covers multi-tenancy. Acceptable. |

No material findings. ✓

---

### F16: `apps/science-advantage/CLAUDE.md`

Single line `@AGENTS.md` — delegates to the AGENTS.md file. Valid Claude Code include directive. No findings. ✓

---

### F17: `apps/science-advantage/DESIGN.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Very detailed design spec with structured YAML frontmatter |
| **AGENTS.md compliance** | No direct conflict |

| Line | Finding |
|------|---------|
| 1–58 | YAML frontmatter with design tokens — good for maintainability. |
| 62–63 | Design rationale: "scientific expedition journals and botanical field guides" — clear direction. ✓ |
| 109–111 | Shadow definitions use `oklch()` — modern CSS color function. No issue for a design doc. |
| 115–141 | Component primitives (EduCard, EduButton, etc.) — these should map to shadcn/ui under the hood per monorepo stack. This is an implementation detail outside this review batch's scope. |
| 144–154 | Do's and Don'ts — helpful. ✓ |

**F-SA-B00-012 [missing-responsive]** — The design doc does not mention responsive breakpoints, mobile-first approach, or tablet layout strategy. Given the K-12 classroom context (likely tablet-heavy), this is a notable omission. **Severity: informational**.

No blocking findings. ✓

---

### F18: `apps/science-advantage/GEMINI.md` ⚠️

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | **Severely outdated** — contradicts current project state |
| **AGENTS.md compliance** | **Major deviation** |

| Line | Finding |
|------|---------|
| 5 | **F-SA-B00-013 [critical-outdated]** — States "Database schema, migrations, and seed scripts are maintained in `prisma/`". The project has fully migrated to **Drizzle** in `packages/db/`. The `prisma/` directory does not exist and its presence is a regression guard failure. This is directly incorrect. **Severity: high**. |
| 9 | **F-SA-B00-014 [tool-mismatch]** — References `npm install`, `npx prisma generate`, `npx prisma db push`, `npx prisma db seed`. Actual tooling: `pnpm` with Drizzle. **Severity: high**. |
| 13 | References "Prisma fields" in naming conventions — should be "Drizzle fields". **Severity: medium**. |
| 25 | **F-SA-B00-015 [outdated-auth]** — References "NextAuth, Google OAuth". The project uses username/password auth via `@reading-advantage/auth` (documented in `apps/science-advantage/AGENTS.md` lines 85–90). Google OAuth is not the auth strategy. **Severity: high**. |
| 29 | "Only Google OAuth is enabled" — directly contradicts the project's actual auth model. **Severity: high**. |
| 37–121 | GitHub workflow instructions duplicate/conflict with content already in AGENTS.md. Creates confusion about the canonical source of truth. **Severity: medium**. |
| 124 | References `CLAUDE.md` — which itself just delegates to AGENTS.md. Circular reference risk. **Severity: low**. |

**Recommendation:** This file should be archived or replaced with a note directing readers to `AGENTS.md`. It is actively harmful for any agent or contributor who discovers it.

---

### F19: `apps/science-advantage/README.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | **Multiple outdated references** |
| **AGENTS.md compliance** | **Several deviations** |

| Line | Finding |
|------|---------|
| 4 | **F-SA-B00-016 [outdated-ref]** — References "Prisma schema". The project uses Drizzle via `packages/db/`. **Severity: medium**. |
| 19 | **F-SA-B00-017 [tool-mismatch]** — `npm install` should be `pnpm install`. The rest of the monorepo and `apps/science-advantage/AGENTS.md` use `pnpm`. **Severity: medium**. |
| 31 | **F-SA-B00-018 [tool-mismatch]** — `docker-compose up -d` should be `docker compose up -d` (modern Docker CLI). **Severity: low**. |
| 36 | Port 5433 for Docker Postgres — the monorepo standard (root AGENTS.md line 325) is port 5432. This is a science-advantage-specific Docker Compose deviation. Documented in AGENTS.md as independent Docker setup — acceptable but potentially confusing. **Severity: informational**. |
| 50 | Same port 5433 URL — consistent with line 36, but differs from monorepo convention. |
| 84–91 | **F-SA-B00-019 [outdated-ref]** — `npx prisma generate`, `npx prisma db push` — all Prisma commands that have been replaced by Drizzle. **Severity: high**. |
| 112 | `npm run dev:reset` — should use `pnpm`. **Severity: low**. |
| 123 | `npm run dev` — should use `pnpm`. **Severity: low**. |
| 172–173 | `npm run test:integration` — should use `pnpm`. **Severity: low**. |
| 203 | Repository layout still lists `prisma/` — should reference `packages/db/` for Drizzle schema. **F-SA-B00-020 [outdated-ref]**. **Severity: medium**. |
| 225–241 | Roadmap section with emoji checkboxes — opinionated style but acceptable. |
| 246 | Heart emoji in footer — cosmetic. |

---

### F20: `apps/science-advantage/RETROSPECTIVE.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Valid organizational memory |
| **AGENTS.md compliance** | No direct conflict |

| Line | Finding |
|------|---------|
| 10 | References Vercel AI SDK `generateObject` for schema validation and multi-model failover — aligns with monorepo AI adapter guidance. ✓ |
| 65, 173 | **F-SA-B00-021 [prisma-debt-evidence]** — Multiple entries reference "Prisma Decimal Type Handling". Confirms that Prisma runtime types are still present in some code paths despite the Drizzle migration. This is technical debt surfaced in retrospectives. **Severity: informational** — flagged for Drizzle migration completeness audit. |
| 159, 218 | Meta-commentary about Gemini summarization of retrospectives — documentary note, no issue. |

The file serves its purpose as organizational memory. No blocking findings. ✓

---

## Cross-Cutting Findings

| ID | Theme | Files Affected | Severity |
|----|-------|---------------|----------|
| F-SA-B00-0XX | **Prisma → Drizzle stale references** | `README.md`, `GEMINI.md`, `story.md`, `task.md` | High (GEMINI.md), Medium (README.md), Low (templates) |
| F-SA-B00-0XX | **npm → pnpm mismatch** | `README.md`, `story.md` | Medium |
| F-SA-B00-009 | **gitignore `\n.tmp/` bug** | `.gitignore` | Low |
| F-SA-B00-010 | **Supply chain: `@latest` + `-y`** | `.opencode/mcp.json` | Medium |
| F-SA-B00-011 | **JSON syntax: trailing comma** | `.opencode/opencode.json` | Low |
| F-SA-B00-002 | **Legacy BMAD process** | `story-with-agents.md` | Low |
| F-SA-B00-013/015 | **Auth model outdated (GEMINI.md)** | `GEMINI.md` | High |

---

## Limitations

1. **Binary file not reviewed:** `apps/science-advantage/.codex/skills/conductor.skill` is a Zip archive and could not be inspected for correctness, security posture, or AGENTS.md alignment.
2. **Call-site audit out of scope:** Env var names (`OPENAI_API_KEY`, model names) suggest possible direct provider SDK usage, but this batch does not include any app code to verify whether the adapter layer is used.
3. **No test quality assessment:** This batch contains zero test files — all files are configuration, documentation, or templates. The first test files appear in sa-batch-01 onwards.
4. **No architecture depth review:** Files in this batch are meta-files (gitignore, prettier, issue templates, design docs). Architectural pattern assessment (command wrapper, domain functions, multi-tenancy) will be meaningful from sa-batch-01 onward when actual TypeScript code appears.
5. **No acceptance/closeout claims:** This report identifies findings for remediation; it does not declare any batch "accepted" or "closed."

---

## Summary

**20 files reviewed.** Key findings:

| Severity | Count |
|----------|-------|
| 🔴 High | 4 (all in `GEMINI.md` and `README.md`) |
| 🟡 Medium | 4 (GEMINI.md tooling, README outdated refs, MCP supply chain, conductor binary) |
| 🔵 Low | 10 (templates, gitignore bug, BMAD legacy, JSON syntax, etc.) |
| ℹ️ Informational | 5 (design missing responsive, prisma-debt evidence, etc.) |

**Most important action items:**
1. **Archive or rewrite `GEMINI.md`** — it is severely outdated and directly contradicts the project's current Drizzle-based, pnpm-driven, username/password-auth architecture.
2. **Update `README.md`** to replace Prisma references with Drizzle and `npm` commands with `pnpm`.
3. **Fix `.opencode/mcp.json`** — pin `chrome-devtools-mcp` to a specific version, consider removing `-y` flag.
4. **Fix `.gitignore` line 68** — `\n.tmp/` is likely a bug, should be `.tmp/` or `tmp/`.
5. **Clean up issue templates** — replace `area:prisma` label examples and Prisma code snippet examples with Drizzle equivalents.
