# Line Review Evidence: primary-advantage-065

Reviewer: coder-minimax-m3/primary-advantage-065
Files assigned: 10
Lines assigned: 1042

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/ui/context-menu.tsx` | 1-252 | reviewed | 0 |
| `apps/primary-advantage/components/ui/copy-button.tsx` | 1-57 | reviewed | 1 |
| `apps/primary-advantage/components/ui/dialog.tsx` | 1-140 | reviewed | 0 |
| `apps/primary-advantage/components/ui/dropdown-menu.tsx` | 1-257 | reviewed | 0 |
| `apps/primary-advantage/components/ui/form.tsx` | 1-167 | reviewed | 0 |
| `apps/primary-advantage/components/ui/input.tsx` | 1-21 | reviewed | 0 |
| `apps/primary-advantage/components/ui/label.tsx` | 1-24 | reviewed | 0 |
| `apps/primary-advantage/components/ui/popover.tsx` | 1-48 | reviewed | 0 |
| `apps/primary-advantage/components/ui/progress.tsx` | 1-31 | reviewed | 0 |
| `apps/primary-advantage/components/ui/radio-group.tsx` | 1-45 | reviewed | 0 |

## Findings

### LR-primary-advantage-065-001 — `copyToClipboardWithMeta` discards Promise and silently swallows clipboard failures

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/ui/copy-button.tsx:10-12`
- Evidence: Lines 10-12 define `copyToClipboardWithMeta(value)` as `() => { navigator.clipboard.writeText(value); }`. The Promise returned by `navigator.clipboard.writeText` is neither awaited nor `.catch()`-handled. The function is annotated `: string => void` (implicit) so the rejection cannot surface. The exported `CopyButton` (lines 14-56) calls this helper at line 43 then unconditionally calls `setHasCopied(true)` (line 44), so any clipboard failure (insecure context, denied permission, missing user activation) still flips the visible state to "Copied" with a `CheckIcon` for 2s (line 25-29 timer).
- Impact: The Clipboard API rejects in non-secure (http://) origins and when the user has not granted permission. In those cases the user receives a false-positive confirmation, which is a correctness bug specific to this fork (no equivalent `copy-button.tsx` exists in `apps/reading-advantage` per workspace search). For primary-student flows that surface share/copy buttons (e.g. classroom codes, assignment links), this can produce silent data loss.
- Recommendation: Either await the Promise in `copyToClipboardWithMeta` and `await` it from the click handler, or chain `.catch()` and only call `setHasCopied(true)` on success. Track as a small UI utility fix in a remediation track; no source edits in this review.

## No-Finding Notes

- `apps/primary-advantage/components/ui/context-menu.tsx`: reviewed line-by-line (1-252). Pure shadcn/ui Radix wrapper. No Prisma/Drizzle, auth, or business logic. No findings.
- `apps/primary-advantage/components/ui/dialog.tsx`: reviewed line-by-line (1-140). Pure shadcn/ui Radix wrapper with a `closeButtonShow` prop extension (line 52). No findings.
- `apps/primary-advantage/components/ui/dropdown-menu.tsx`: reviewed line-by-line (1-257). Pure shadcn/ui Radix wrapper. No findings.
- `apps/primary-advantage/components/ui/form.tsx`: reviewed line-by-line (1-167). shadcn/ui form primitive bound to react-hook-form `FormProvider`. No findings.
- `apps/primary-advantage/components/ui/input.tsx`: reviewed line-by-line (1-21). shadcn/ui native input wrapper. No findings.
- `apps/primary-advantage/components/ui/label.tsx`: reviewed line-by-line (1-24). shadcn/ui Radix label wrapper. No findings.
- `apps/primary-advantage/components/ui/popover.tsx`: reviewed line-by-line (1-48). shadcn/ui Radix popover wrapper. No findings.
- `apps/primary-advantage/components/ui/progress.tsx`: reviewed line-by-line (1-31). shadcn/ui Radix progress wrapper. No findings.
- `apps/primary-advantage/components/ui/radio-group.tsx`: reviewed line-by-line (1-45). shadcn/ui Radix radio-group wrapper. No findings.