# Spec: Warm Dashboard Performance

## Problem

The warm-dashboard page load (`GET /en/`) measured 1363ms in the Phase 6 prod-smoke suite,
36% over the P1 budget of 1000ms. Cold-start is within budget; the issue is warm-request
latency on the Cloud Run revision serving codecamp-advantage.

## Acceptance Criteria

1. Warm `GET /en/` returns in < 1000ms (measured end-to-end from a network with reliable reach
   to `codecamp.reading-advantage.com`).
2. The Phase 6 P1 launch gate (`GET /en/ (warm) took <budget>ms — budget 1000ms`) passes.
3. No regression in the cold-start budget (< 5s).

## Out of Scope

- Cold-start optimization (separate track: `codecamp_infra_cold_start_20260608`).
- Render-blocking script removal (separate track: `codecamp_asset_render_blocking_20260608`).
