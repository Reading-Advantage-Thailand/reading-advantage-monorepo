# Unit 07 Overview: React

**Phase:** B (Frameworks)
**Periods:** 7
**Portfolio Project:** Learning Dashboard (React SPA)

## Learning Objectives

By the end of this unit, the intern can:

1. Create React 19.2.5 components (function components only — no class components)
2. Pass data with props and compose components
3. Manage local state with `useState`
4. Handle side effects with `useEffect`
5. Share state across components with `useContext`
6. Render lists with `map` and understand the `key` prop
7. Handle forms with controlled components
8. Extract custom hooks for reusable logic

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.5 | UI library |
| React DOM | 19.2.5 | DOM rendering |
| Vite | Latest | Dev server and build tool (for SPA, not Next.js) |

## Portfolio Connection

The intern builds the **Learning Dashboard** as a React SPA — the same kind of dashboard they use daily in codecamp-advantage. This standalone React app will later be migrated to Next.js in Unit 09.

Dashboard features:
- Module list with progress bars
- Module detail view with lesson cards
- Quiz component
- Chat widget (static UI, no API yet)
- Dark mode toggle with context

## Key Conventions

- **Function components only** — no class components
- **One component per file** — file name matches component name
- **Props are read-only** — never mutate props
- **State lives as close to where it's used as possible** — lift only when shared
- **Custom hooks start with `use`** — e.g., `useLocalStorage`, `useTheme`

## Prerequisites

- Units 01–06 complete (all Phase A foundations)

## Assessment

- Exercise repo: Build a filterable data table with React
- Quiz at the end of Period 7 (5 questions)
