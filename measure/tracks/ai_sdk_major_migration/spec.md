# Specification: AI SDK Major Migration

## Background

The monorepo uses `@ai-sdk/google` and `@ai-sdk/openai` for all AI features
(text generation, streaming, embeddings, structured output). A new major
version of the AI SDK introduces breaking changes to the provider API,
tool calling, and streaming interfaces.

## Acceptance Criteria

1. All `@ai-sdk/*` packages upgraded to the target major version.
2. Internal AI adapter layer (`packages/domain/src/ai/`) updated for new API.
3. All apps compile with `check-types` clean.
4. All existing AI-dependent tests pass.
5. No direct `@ai-sdk` imports in app code — all routed through the adapter.
6. Streaming, tool calling, and structured output verified in at least one app.
7. Generate/ embed functions verified with provider-specific tests.
8. `pnpm outdated -r` shows zero `@ai-sdk` packages behind latest major.
9. `pnpm audit --json` shows no new advisories introduced by the upgrade.
10. Documentation updated in `measure/tech-stack.md` with the selected AI SDK version.
