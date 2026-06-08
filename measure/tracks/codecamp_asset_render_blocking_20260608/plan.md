# Implementation Plan: Render-Blocking Script Removal

## Phase 1: Identification (P0)

- [ ] Task: Identify the render-blocking script
  - [ ] Run `countRenderBlockingScripts` on the prod HTML to locate the exact `<script>` tag
  - [ ] Determine if it is a Next.js internal script, a third-party script, or a misconfiguration

## Phase 2: Fix (P0)

- [ ] Task: Remove or defer the render-blocking script
  - [ ] Add `defer`, `async`, or `type="module"` attribute as appropriate
  - [ ] If third-party, evaluate moving to `<Script strategy="lazyOnload">` (Next.js `next/script`)

## Phase 3: Verification (P0)

- [ ] Task: Re-run Phase 6 asset-loading probes
  - [ ] Zero render-blocking scripts in `<head>` for `/en/` and `/th/`
  - [ ] Page functionality regression check
