# Track: Reading Advantage Games Migration

## Files

- [Specification](./spec.md) - Requirements and acceptance criteria
- [Implementation Plan](./plan.md) - Phased task breakdown

## Overview

Import all games from the reading-advantage repository, restructuring advantage-games to match reading-advantage's architecture for seamless two-way synchronization.

## Status

**Current Phase:** Phase 6 (Cleanup)
**Next Task:** Phase 6, Task 6.5 - Final verification, then Phase 7

## Key Decisions

1. **Directory split** - Adopt vocabulary/sentence structure to match reading-advantage
2. **Mock API routes** - Create `/api/v1/games/{game}/vocabulary` routes for same interface
3. **i18n stubs** - Add `useScopedI18n` and `useCurrentLocale` hooks
4. **Session stub** - Add `useSession` hook returning mock authenticated user
5. **Unified API factories** - Create reusable route factories for easy game scaffolding
6. **Template modernization** - Update templates to match current directory structure
