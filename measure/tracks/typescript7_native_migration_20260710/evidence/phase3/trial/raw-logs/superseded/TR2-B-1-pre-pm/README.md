# Superseded TR2-B-1 evidence

These files predate the PM deviation of 2026-11-28 16:32.

The first harness stopped in its load wait. The next run used a side TypeScript 5.9.3 compiler but left TypeScript 7.0.2 visible to module resolution. That control is invalid for workspaces that import the TypeScript API.

The final run swaps the root TypeScript package for each control attempt. It restores TypeScript 7.0.2 before the paired trial attempt.

Only the harness summary and first time file remain. The invalid per-workspace files were removed after the final record was assembled.
