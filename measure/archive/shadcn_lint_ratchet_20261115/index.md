# Track: shadcn lint ratchet

Track: `shadcn_lint_ratchet_20261115` (light lane, chore). Author model: opencode-go/deepseek-v4.1-flash.

- [spec.md](./spec.md): the ratchet rule, the baseline format, the exit codes, and AC-1 to AC-5.
- [plan.md](./plan.md): Phase 1 tasks and the gate output.
- [metadata.json](./metadata.json): status and the deviation note.
- [Closeout manifest](./automation-supervisor-closeout-manifest.json): the closeout record.

Step 1 of PM order A-32. The single-source move of the copies into `packages/ui` is a later step.

Archived 2026-11-16. CI run 43798094179 on `e502b81f0` passed the steps "Install shadcn lint
plugin" and "Shadcn lint ratchet" in the job "Build, Lint, and Test".

The gate keeps the plugin out of the workspace. CI installs `@shadcn/lint@0.2.5` in
`$RUNNER_TEMP/shadcn-lint`, and `SHADCN_LINT_DIR` names that folder. A local run sets the same
variable to a temp install. A missing plugin exits 2.
