# Line Review Evidence: primary-advantage-022

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-022
Files assigned: 1
Lines assigned: 1297

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/admin/article-creation.tsx` | 1-1297 | reviewed | 8 |

## Findings

### LR-primary-advantage-022-001 — Article deletion lacks authorization and role check

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/article-creation.tsx:550-571`
- Evidence: `handleDeleteArticle(articleId)` calls the server action `getDeleteArticleById(articleId)` (imported from `@/actions/article:61`) which delegates to `deleteArticleByIdModel(articleId)` (`server/models/articleModel.ts:532-549`). No `currentUser()`, role check, or ownership verification occurs anywhere in this chain. The component renders the delete button for every article in the list (lines 1270-1285) without conditionally hiding it based on user role.
- Impact: Any authenticated user (including a student) can delete any article by triggering this action. Articles are hard-deleted in a transaction (line 534-542) with associated file deletion, making recovery difficult.
- Recommendation: Add `currentUser()` and admin/system role check in the server action before calling `deleteArticleByIdModel`. Restrict the delete button visibility in the component to admin/system roles only.

### LR-primary-advantage-022-002 — Article generation, save, and approve lack role-based authorization

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/admin/article-creation.tsx:224-290,313-371,402-463,465-534`
- Evidence: All four major workflow functions (`confirmApproval`, `handleGenerate`, `handleSaveArticle`, `handleApproveAndPublishButton`) call API endpoints that check `currentUser()` for authentication but never verify the user is an admin or has system role. The API controllers in `server/controllers/articleController.ts` (`generateCustomArticle:186`, `saveArticleAndPublish:224`, `saveArticleAsDraft:256`, `fetchCustomArticleController:280`) all only return 401 for unauthenticated users. No 403 role check exists in any of these paths.
- Impact: Any authenticated user (student, teacher) can generate AI articles, save drafts, approve/publish content, and manage the article lifecycle. In a primary-student context, this means a child could publish content visible to the entire school.
- Recommendation: Add role-based authorization (admin/system only) in the API controllers or in the component's render logic to restrict access to these functions.

### LR-primary-advantage-022-003 — Direct DOM manipulation to bypass React loading state

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/article-creation.tsx:281,369,461,532`
- Evidence: Four `finally` blocks set `document.body.style.pointerEvents = "auto"` to forcefully re-enable body interaction after loading states. This pattern appears in `confirmApproval` (line 281), `handleGenerate` (line 369), `handleSaveArticle` (line 461), and `handleApproveAndPublishButton` (line 532). The loading dialog uses `<Dialog open={showLoadingDialog} onOpenChange={() => {}}>` (line 639) which prevents user dismissal, so this DOM hack is the only way to restore interactivity if state reset fails.
- Impact: If an error occurs before `setShowLoadingDialog(false)` is called, or if React state update batching delays the state reset, the body remains in a non-interactive state. This is fragile and bypasses React's declarative model.
- Recommendation: Remove all `document.body.style.pointerEvents` manipulation. Ensure `setShowLoadingDialog(false)` is always called in finally blocks. If the loading dialog must be non-dismissable, use a proper React pattern for body scroll lock.

### LR-primary-advantage-022-004 — Commented-out null check leaves confirmApproval vulnerable to undefined pendingApprovalId

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/article-creation.tsx:225`
- Evidence: Line 225 contains a commented-out guard: `// if (!pendingApprovalId) return;`. Without this check, the function proceeds to `setLoadingType("approve")` and `setShowApprovalDialog(false)` (lines 228-230) even when `pendingApprovalId` is null. The fallback on lines 232-239 constructs an article from `generatedData` which may also be null, sending an empty `{}` object to the approve endpoint (line 246-255).
- Impact: If `confirmApproval` is triggered when `pendingApprovalId` is null and `generatedData` is also null, the API receives `{ article: {} }`. The controller (`saveArticleAndPublish:237`) then calls `createdArticleCustom({})` which may insert a record with undefined fields.
- Recommendation: Restore the null guard or add explicit validation: `if (!pendingApprovalId && !generatedData) return;`.

### LR-primary-advantage-022-005 — Unstructured console.error logging throughout component

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/article-creation.tsx:215,271,359,450,520`
- Evidence: Five `console.error(...)` calls exist: line 215 in `fetchUserArticles`, line 271 in `confirmApproval`, line 359 in `handleGenerate`, line 450 in `handleSaveArticle`, line 520 in `handleApproveAndPublishButton`. All use unstructured string messages. Root AGENTS.md observability section requires structured logs with request identifiers, user identifiers, and operation names.
- Impact: Production errors produce unstructured, unsearchable logs missing context for debugging.
- Recommendation: Replace with the project's structured logger, including user context and operation metadata.

### LR-primary-advantage-022-006 — Variable name `Response` shadows the global Response constructor

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/article-creation.tsx:488`
- Evidence: `const Response = await fetch(...)` uses a capital-R variable name that shadows the global `Response` constructor. All other fetch calls in this file correctly use lowercase `response`. If any future code in this function references the global `Response`, it would silently refer to the fetch result instead.
- Impact: Shadowing creates a maintenance trap; TypeScript may not catch incorrect usage depending on context.
- Recommendation: Rename to `response` (lowercase) for consistency with the rest of the file.

### LR-primary-advantage-022-007 — Unused StatusConfigMap interface is dead code

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/article-creation.tsx:64-76`
- Evidence: The `StatusConfig` and `StatusConfigMap` interfaces are defined (lines 64-74) but never referenced anywhere in the component. The `ArticleStatus` type alias on line 76 uses `StatusConfigMap` but is itself never used — line 1200 has `article.status as ArticleStatus` in a comment, but the actual code uses `article.isDraft` for the badge logic (line 1201).
- Impact: Dead code increases cognitive load and may confuse future maintainers about the intended status model.
- Recommendation: Remove `StatusConfig`, `StatusConfigMap`, and `ArticleStatus` if they serve no purpose.

### LR-primary-advantage-022-008 — Thai comments remain in production code

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/article-creation.tsx:383,442`
- Evidence: Line 383: `// เซ็ต original content` (Thai for "set original content"). Line 442: `// Update local state และ original content` (Thai for "and"). The rest of the codebase uses English comments.
- Impact: Thai comments reduce readability for non-Thai-speaking contributors and are inconsistent with project conventions.
- Recommendation: Translate to English or remove.

## No-Finding Notes

- `apps/primary-advantage/components/admin/article-creation.tsx`: reviewed line-by-line (1-1297); all lines accounted for. Findings above cover material issues. No additional findings beyond those listed.
