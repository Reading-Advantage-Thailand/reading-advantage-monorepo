# Spec: Render-Blocking Script Removal

## Problem

The Phase 6 asset-loading probes (`countRenderBlockingScripts`) found 1 synchronous external
`<script src=...>` tag in `<head>` that lacks `defer`, `async`, or `type="module"`. This
blocks the critical rendering path and delays first contentful paint.

## Acceptance Criteria

1. `GET /en/` has zero render-blocking external `<script>` tags in `<head>`.
2. `GET /th/` has zero render-blocking external `<script>` tags in `<head>`.
3. The Phase 6 render-blocking probes pass on prod.
4. No regression in page functionality (scripts still load and execute correctly).

## Out of Scope

- Warm-dashboard latency optimization (separate track: `codecamp_perf_warm_dashboard_20260608`).
- Cold-start optimization (separate track: `codecamp_infra_cold_start_20260608`).
