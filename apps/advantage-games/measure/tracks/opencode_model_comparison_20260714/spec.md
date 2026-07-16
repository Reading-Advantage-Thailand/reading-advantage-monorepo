# Specification: OpenCode Model Subscription and Cost Comparison

## Problem

The team needs a current, source-backed inventory of models available through OpenCode subscriptions and low-cost API providers before selecting models for different coding and research workloads.

## Functional Requirements

- FR-1: Inventory all relevant models exposed by the local `opencode models` command for Volcengine, MiniMax, OpenAI, Xiaomi, and DeepSeek.
- FR-2: Distinguish subscription-backed model access from low-cost API access and record model/provider identity accurately.
- FR-3: Collect benchmark evidence with explicit source dates and identify reasoning-level controls where documented.
- FR-4: Produce a concise comparison table and recommendation-oriented report without presenting unsupported rankings as facts.

## Acceptance Criteria

- AC-1: The report lists the locally observed model IDs grouped by provider and access class.
- AC-2: Benchmark claims cite primary provider or benchmark sources and distinguish measured results from vendor claims.
- AC-3: Reasoning effort/level support is recorded as documented, unavailable, or not comparable.
- AC-4: The final comparison states evidence gaps and practical next steps for a controlled evaluation.
