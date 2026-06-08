# Spec: Cold-Start Performance

## Problem

The Phase 1 and Phase 6 prod-smoke suites observed cold-start times exceeding the 5-second
P0 budget. The first request to a scaled-from-zero Cloud Run instance takes too long,
impacting user experience on initial page loads after idle periods.

## Acceptance Criteria

1. Cold-start `GET /en/` returns in < 5 seconds (first request after scale-from-zero).
2. The Phase 1 cold-start sub-check passes on prod.
3. No regression in warm-request latency.

## Out of Scope

- Warm-dashboard latency optimization (separate track: `codecamp_perf_warm_dashboard_20260608`).
- Render-blocking script removal (separate track: `codecamp_asset_render_blocking_20260608`).
