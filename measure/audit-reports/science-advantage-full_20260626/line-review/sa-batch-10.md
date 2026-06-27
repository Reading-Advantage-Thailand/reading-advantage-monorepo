# Line Review: sa-batch-10

- **Track:** `science_advantage_review_20260626`
- **Batch:** 10 (20 files)
- **Reviewer focus:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns
- **Scope:** Teacher dashboard UI components, theme utilities, shadcn/ui primitives
- **Date:** 2026-06-27

---

## File-by-File Review

### F1: `apps/science-advantage/components/features/teacher/recent-completions-feed.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Mostly sound |
| **Security/tenancy** | ✓ — uses `credentials: "include"`, no tenant ID passed from client |
| **AGENTS.md compliance** | See findings |
| **Test quality** | No test file in batch |
| **Architecture** | Client component fetches from route handler → domain function, good layering |

| Line(s) | Finding |
|---------|---------|
| 6 | Imports `@/components/client-logger` — resolves to `client-logger.ts`. See cross-cutting **F-SA-B10-017**. |
| 108 | `new URL("/api/teachers/dashboard", window.location.origin)` constructs an absolute URL from a relative path. Redundant — `fetch("/api/teachers/dashboard", ...)` achieves the same. Inconsistent with F3 which uses a plain relative path. |
| 113–126 | `fetch` → `response.json()` → assigns `payload.recentCompletions` without any runtime schema validation. Per AGENTS.md ("Runtime validation is required at all external boundaries"), the response from the API should be validated with Zod at the client boundary. See cross-cutting **F-SA-B10-018**. |
| 196–199 | Error display renders `TEXT.error.title.en` and `TEXT.error.title.th` as sibling elements (not using `DualText`). The Thai description `TEXT.error.description.th` is not rendered at all — only the English description appears. Incomplete i18n. |
| 90–96 | `getScoreColor` returns hardcoded Tailwind color classes (`text-blue-600`, `text-green-600`, etc.) rather than CSS-variable-based tokens. These fixed values may not render correctly in dark mode. |

**Findings:**

| ID | Severity | Description |
|----|----------|-------------|
| F-SA-B10-001 | 🟡 Medium | No Zod validation of API response; `payload.recentCompletions` trust-cast |
| F-SA-B10-002 | 🔵 Low | Redundant `new URL(…, window.location.origin)` — plain relative path works |
| F-SA-B10-003 | 🔵 Low | Missing Thai description in error state; English-only fallback for part of the message |
| F-SA-B10-004 | ℹ️ Info | Hardcoded score colors may not adapt to dark mode |

---

### F2: `apps/science-advantage/components/features/teacher/students-need-attention-card.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Mostly sound |
| **Security/tenancy** | ✓ — same pattern as F1 |
| **AGENTS.md compliance** | See findings |
| **Architecture** | Consistent with F1 — both fetch from same `/api/teachers/dashboard` endpoint |

| Line(s) | Finding |
|---------|---------|
| 74–106 | Same fetch pattern as F1 — uses `new URL(...)` and `window.location.origin`. Same redundant absolute URL construction. |
| 84–86 | `credentials: "include"` — correct for cookie-based auth. ✓ |
| 97 | `setCount(payload.studentsNeedingAttention)` — no runtime type check on the response. |
| 99 | `clientLogger.error(...)` — log call is dead code in production per **F-SA-B10-017**. |
| 157–159 | Error display renders `TEXT.error.description.en` but lacks `TEXT.error.description.th`. Only the English description is shown. Identical i18n gap to F1. |

**Findings:**

| ID | Severity | Description |
|----|----------|-------------|
| F-SA-B10-005 | 🟡 Medium | No Zod validation of API response; `payload.studentsNeedingAttention` trust-cast |
| F-SA-B10-006 | 🔵 Low | Redundant `new URL(...)` construction (same pattern as F1) |
| F-SA-B10-007 | 🔵 Low | Missing Thai description in error state |

---

### F3: `apps/science-advantage/components/features/teacher/teacher-dashboard-classes.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Security/tenancy** | ✓ — relative fetch with `credentials: "include"`, no tenant id from client |
| **AGENTS.md compliance** | Mostly compliant; see findings |
| **Architecture** | Best-pattern among the three dashboard components — clean pagination, proper state separation |

| Line(s) | Finding |
|---------|---------|
| 5 | `import type { StandardsAlignment } from "@/lib/enums"` — used in the `ClassSummary` interface but the interface is only employed as an `as` cast. The type is never enforced at runtime. |
| 131–134 | Uses plain relative path `fetch("/api/classes?...")` — differs from F1/F2 which use `new URL()`. Inconsistency is harmless but suggests different authorship. |
| 136 | `(await response.json()) as ListClassesResponse` — TypeScript `as` cast provides zero runtime safety. If the API shape changes, this silently produces garbage. |
| 141–144 | Error handling distinguishes 401 vs generic error messages — good UX. |
| 240–253 | Full i18n in empty state, including CTA button — more complete than F1/F2 error states. |
| 264–279 | "Load more" pagination — well-structured conditional rendering. |

**Findings:**

| ID | Severity | Description |
|----|----------|-------------|
| F-SA-B10-008 | 🟡 Medium | `as ListClassesResponse` cast without Zod runtime validation |
| F-SA-B10-009 | 🔵 Low | Redundant absolute URL construction in F1/F2 is inconsistent with plain relative path here |

---

### F4: `apps/science-advantage/components/features/teacher/teacher-nav.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Security/tenancy** | ✓ — no data fetching, no auth surface |
| **AGENTS.md compliance** | Minor i18n gap |
| **Architecture** | Clean, minimal navigation component |

| Line(s) | Finding |
|---------|---------|
| 10 | Label "Dashboard" — English only, no `DualText` wrapper. |
| 15 | Label "Classes" — English only, no `DualText` wrapper. |
| 11 | `isActive: (pathname) => pathname === '/teacher'` — exact match only. A trailing-slash path (`/teacher/`) would not match. Next.js normally normalizes this, so practical impact is near-zero. |
| 7–19 | `NAV_ITEMS` defined with `satisfies` — good TypeScript practice for type narrowing. |

**Findings:**

| ID | Severity | Description |
|----|----------|-------------|
| F-SA-B10-010 | 🔵 Low | Nav labels are English-only; no i18n support unlike the other dashboard components |
| F-SA-B10-011 | ℹ️ Info | `isActive` exact match could miss trailing-slash variant (practically harmless) |

---

### F5: `apps/science-advantage/components/mode-toggle.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | See finding |
| **Architecture** | Standard pattern for theme toggle |

| Line(s) | Finding |
|---------|---------|
| 14 | `setTheme(theme === "light" ? "dark" : "light")` — simple toggle between two themes. Does not handle `"system"` theme mode. If `next-themes` is configured with `system` as an option, toggling from `system` to `dark` is correct, but toggling back from `dark` always goes to `light` rather than restoring `system`. This is the standard trade-off for a simple toggle. |
| 18 | `<span className="sr-only">Toggle theme</span>` — accessible label is English only. Thai screen reader users would hear English. |

**Findings:**

| ID | Severity | Description |
|----|----------|-------------|
| F-SA-B10-012 | 🔵 Low | SR-only accessible label is English-only, no i18n |

---

### F6: `apps/science-advantage/components/theme-provider.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Correct passthrough wrapper around `next-themes` |

No findings. ✓

---

### F7: `apps/science-advantage/components/ui/accordion.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **AGENTS.md compliance** | Compliant |
| **Architecture** | Uses `React.forwardRef` (older shadcn pattern) — see cross-cutting |

| Line(s) | Finding |
|---------|---------|
| 11–20, 23–41, 43–55 | Uses `React.forwardRef` with `React.ElementRef<>` and `React.ComponentPropsWithoutRef<>` — older shadcn API pattern. All other UI primitives in this batch use direct function components with `React.ComponentProps<typeof Primitive.Root>`. Inconsistent but functionally equivalent. |

**Findings:**

| ID | Severity | Description |
|----|----------|-------------|
| F-SA-B10-013 | 🔵 Low | Uses `forwardRef` pattern while sibling components use newer function-component pattern |
| F-SA-B10-014 | ℹ️ Info | Older shadcn API pattern; likely generated by a different version of `shadcn-ui init` |

---

### F8: `apps/science-advantage/components/ui/alert-dialog.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Uses `React.ComponentProps<>` function-component pattern (newer shadcn) |

No findings. ✓

---

### F9: `apps/science-advantage/components/ui/alert.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Uses CVA, clean separation of `Alert`, `AlertTitle`, `AlertDescription` |

No findings. ✓

---

### F10: `apps/science-advantage/components/ui/avatar.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Standard `@radix-ui/react-avatar` wrapper |

No findings. ✓

---

### F11: `apps/science-advantage/components/ui/badge.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Custom `scoreBlue`/`scoreGreen`/`scoreYellow`/`scoreRed` variants added for app-specific scoring badges |

| Line(s) | Finding |
|---------|---------|
| 21–27 | App-specific `scoreBlue`, `scoreGreen`, `scoreYellow`, `scoreRed` variants — legitimate extension of the standard shadcn badge. Good separation of concerns. |
| 38–44 | `asChild` prop via `@radix-ui/react-slot` — standard pattern for polymorphic components. |

**Findings:**

| ID | Severity | Description |
|----|----------|-------------|
| F-SA-B10-015 | ℹ️ Info | Custom score variants are a legitimate domain-specific extension of shadcn |

---

### F12: `apps/science-advantage/components/ui/button.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Standard shadcn pattern with CVA; adds custom size variants |

| Line(s) | Finding |
|---------|---------|
| 8 | Complex Tailwind class string — correct usage. |
| 23–25 | Custom `icon-sm` (size-8, rounded-lg) and `icon-lg` (size-11, rounded-2xl) sizes — app-specific additions. |
| 35–54 | `asChild` via `Slot` for polymorphic usage — correct. |

No material findings. ✓

---

### F13: `apps/science-advantage/components/ui/card.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Adds `CardAction` sub-component beyond standard shadcn |

| Line(s) | Finding |
|---------|---------|
| 51–62 | `CardAction` component — custom extension for card-level action areas. |
| 84–92 | Exports `CardAction` alongside standard exports. |

**Findings:**

| ID | Severity | Description |
|----|----------|-------------|
| F-SA-B10-016 | ℹ️ Info | `CardAction` is a legitimate app-specific extension beyond standard shadcn |

---

### F14: `apps/science-advantage/components/ui/checkbox.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Standard `@radix-ui/react-checkbox` wrapper |

No findings. ✓

---

### F15: `apps/science-advantage/components/ui/collapsible.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Standard `@radix-ui/react-collapsible` wrapper, uses `data-slot` attributes |

No findings. ✓

---

### F16: `apps/science-advantage/components/ui/dropdown-menu.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Comprehensive `@radix-ui/react-dropdown-menu` wrapper with all sub-components |

| Line(s) | Finding |
|---------|---------|
| 65–69 | `DropdownMenuItem` accepts `inset` and `variant` props with `"default"` and `"destructive"` options — correct pattern. |
| 85–108 | `DropdownMenuCheckboxItem` — check icon via `DropdownMenuPrimitive.ItemIndicator` — correct. |
| 146–163 | `DropdownMenuLabel` with `inset` support — correct. |
| 74 | `data-inset={inset}` uses boolean-to-string coercion — `true` → `"true"`, `false` → `"false"`. Radix treats `data-inset` presence, so `data-inset="false"` still applies the attribute which may cause unexpected styling. Minor issue — should use `data-inset={inset ? "" : undefined}` or omit the attribute when false. |

**Findings:**

| ID | Severity | Description |
|----|----------|-------------|
| F-SA-B10-017 | ℹ️ Info | `data-inset={inset}` passes `"false"` string when `inset` is false; Radix reads attribute presence not value. Harmless with current CSS selectors but fragile. |

---

### F17: `apps/science-advantage/components/ui/form.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Standard shadcn form using `react-hook-form` context pattern |

| Line(s) | Finding |
|---------|---------|
| 28–30 | `FormFieldContext` created with empty object cast `{} as FormFieldContextValue` — standard React pattern for context that's always provided by a parent. |
| 46–66 | `useFormField` hook — correctly accesses `FormFieldContext` and `FormItemContext`, throws if used outside a `<FormField>`. |
| 113–118 | `FormControl` sets `aria-describedby` conditionally based on error state — correct accessibility pattern. |
| 140 | `const body = error ? String(error?.message ?? "") : props.children` — `String()` wrapper is redundant (`.message` is already a string) but harmless. The `children` fallback for non-error state is a pragmatic pattern for custom messages. |

No material findings. ✓

---

### F18: `apps/science-advantage/components/ui/input.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Standard shadcn input with `data-slot` and `aria-*` variants |

No findings. ✓

---

### F19: `apps/science-advantage/components/ui/label.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Standard `@radix-ui/react-label` wrapper |

| Line(s) | Finding |
|---------|---------|
| 16 | `group-data-[disabled=true]:pointer-events-none` — uses Tailwind's `group-data-*` variant for disabled state styling on a parent group. Correct pattern for form field groups. |

No material findings. ✓

---

### F20: `apps/science-advantage/components/ui/progress.tsx`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound |
| **Architecture** | Standard `@radix-ui/react-progress` wrapper |

| Line(s) | Finding |
|---------|---------|
| 25 | `style={{ transform: `translateX(-${100 - (value || 0)}%)` }}` — `value || 0` defaults to 0 when `value` is `null` or `undefined`, resulting in a full bar (translateX(-100%) → indicator at 0%). This is the correct default. |

No material findings. ✓

---

## Cross-Cutting Findings

| ID | Severity | Description | Affected Files |
|----|----------|-------------|----------------|
| F-SA-B10-018 | 🟡 Medium | **No Zod validation at client API boundary.** All three data-fetching components cast `response.json()` to TypeScript types (`as` or property access) without any runtime schema validation. Per AGENTS.md: "Runtime validation is required at all external boundaries. Do not rely solely on TypeScript types." This makes the UI vulnerable to silent failures if the API contract changes. | F1, F2, F3 |
| F-SA-B10-019 | 🔵 Low | **Inconsistent URL construction.** F1 and F2 use `new URL("/api/teachers/dashboard", window.location.origin)` while F3 uses a plain relative `fetch("/api/classes?...")`. These should be consistent. | F1, F2, F3 |
| F-SA-B10-020 | ✅ Positive | **Correct multi-tenant security posture.** All three data-fetching components use `credentials: "include"` for cookie-based auth. No tenant ID is ever sent from the client — the server extracts `schoolId` from the session. Both `/api/teachers/dashboard` and `/api/classes` API routes correctly use `session.user.schoolId` and pass it to domain functions via `tenant: { schoolId: ... }`. This fully aligns with AGENTS.md's "Never trust tenant IDs from the frontend" rule. | F1, F2, F3, API routes |
| F-SA-B10-021 | 🔵 Low | **i18n completeness varies across error states.** F3 (`TeacherDashboardClasses`) has complete Thai+English in error/empty states. F1 and F2 are missing the Thai description in their error blocks. The `TeacherNav` and `ModeToggle` components have no i18n at all. | F1, F2, F4, F5 |
| F-SA-B10-022 | 🟡 Medium | **`client-logger` suppresses all output in production.** The entire `components/client-logger.ts` file gags every log level (`info`, `warn`, `error`, `debug`) when `NODE_ENV === 'production'`. The `clientLogger.error(...)` calls in F1, F2, and F3 are therefore dead code in production. While server-side logging captures errors at the API route level, the `clientLogger` calls create a false sense of client-side observability. If the intent is production logging, a real logging sink (Sentry, OpenTelemetry) should be used. | F1, F2, F3, `client-logger.ts` |
| F-SA-B10-023 | ℹ️ Info | **Mixed shadcn generation versions.** `accordion.tsx` uses the older `forwardRef` + `React.ElementRef`/`ComponentPropsWithoutRef` pattern while all other UI primitives in this batch use the newer function-component + `React.ComponentProps<typeof Primitive.Root>` pattern. This suggests these files were generated by different runs of `shadcn-ui init`. | F7 (`accordion.tsx`) vs F8–F20 |
| F-SA-B10-024 | 🔵 Low | **`DropdownMenu` `data-inset` fragility.** `data-inset={inset}` passes `"false"` as a string when `false`, which Radix treats as attribute-present. Should use conditional attribute to avoid `data-inset="false"` being rendered. | F16 |

---

## Limitations

1. **No test files in this batch.** All 20 files are UI components. Test quality assessment requires a batch containing `.test.ts` or `.spec.ts` files.
2. **No domain/backend logic.** The batch is entirely frontend components and shadcn/ui primitives. Architecture compliance with the `command()` wrapper, domain function, and permission patterns cannot be assessed here.
3. **API route audit is partial.** The server-side routes (`/api/teachers/dashboard`, `/api/classes`) were checked to confirm they handle auth and tenancy correctly, but they are not in this batch — their domain function internals were not audited.
4. **No acceptance/closeout claims.** This report identifies findings for remediation; it does not declare any batch "accepted" or "closed."
5. **`client-logger.ts`** was reviewed as supplementary context but is not in the batch file list. Its finding (F-SA-B10-022) is included because it directly affects the correctness of the batched components' error handling.

---

## Summary

**20 files reviewed.** 24 findings (F-SA-B10-001 through F-SA-B10-024).

| Severity | Count | Key areas |
|----------|-------|-----------|
| 🟡 Medium | 3 | No Zod validation at client API boundary (×3 components); client-logger dead code in production |
| 🔵 Low | 9 | i18n gaps (4 components), redundant URL construction (×2), forwardRef inconsistency, data-inset fragility, inconsistent pattern |
| ℹ️ Info | 6 | Score colors, card action extension, badge variants, mixed shadcn versions, trailing-slash matching, the `data-inset` note |
| ✅ Positive | 1 | Correct multi-tenant auth/tenancy in all data-fetching components |

**Most important action items:**

1. **Add Zod runtime validation** for API responses in `RecentCompletionsFeed`, `StudentsNeedAttentionCard`, and `TeacherDashboardClasses`. The `as` casts are a type-safety gap. Consider a shared `fetchWithValidation` helper or a Zod schema for each API contract.
2. **Fix the client-logger production gap** — either wire it to a real production logging sink (Sentry, OpenTelemetry) or remove the dead-code `clientLogger.error()` calls from the components.
3. **Fix incomplete Thai i18n** in error states in F1 and F2 (`TEXT.error.description.th` is never rendered).
4. **Add i18n to `TeacherNav` and `ModeToggle`** or document that these are intentionally English-only.
5. **Normalize URL construction** across F1/F2 (redundant absolute URL) vs F3 (plain relative path).
6. **Fix `data-inset` in `DropdownMenuItem`** to avoid passing `data-inset="false"` when `inset` is false.
