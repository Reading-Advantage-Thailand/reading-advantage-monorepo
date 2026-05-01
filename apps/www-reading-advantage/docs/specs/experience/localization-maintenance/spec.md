# Localization Source of Truth Consolidation

## Overview

Remove the duplicated translation datasets (`src/locales/**` TypeScript modules vs. `src/messages/**` JSON) and establish a single, tooling-friendly source of truth. Provide maintainers with a CLI that can surface translation keys in a tree view and update a subset of keys across all locales without reformatting or reloading entire files. The goal is to make copy changes safe, auditable, and ergonomic for a static marketing site that serves multiple languages.

## Requirements

### Requirement: Detect the active translation pipeline

An automated check SHALL verify which dataset is actually loaded at runtime so we can confidently delete the unused copy.

#### Scenario: Runtime verification
- **WHEN** `npm run i18n:verify` executes
- **THEN** it SHALL import the production `localeImports` configuration, capture which modules are referenced, and report the active source (expected: `src/locales/**`)
- **AND** it SHALL fail if the app ever references both datasets or an unexpected path.

#### Scenario: CI enforcement
- **WHEN** the verification script runs in CI
- **THEN** the build SHALL fail if the active dataset differs from the configured source of truth.

### Requirement: Remove redundant dataset safely

After confirmation, the unused dataset SHALL be retired without breaking the i18n pipeline.

#### Scenario: Post-migration tree
- **WHEN** the project is inspected after the migration
- **THEN** only one canonical directory (e.g., `src/i18n/messages/**`) SHALL contain translation strings
- **AND** all imports in the codebase SHALL point to that canonical location.

#### Scenario: Legacy guard
- **WHEN** someone attempts to import from the deprecated path
- **THEN** the codebase SHALL provide a lint rule or compile-time failure explaining the correct source.

### Requirement: Provide translation tree discovery

Maintainers SHALL be able to visualize translation keys and filter by namespace to quickly locate strings.

#### Scenario: Tree view CLI
- **WHEN** `npm run i18n:tree --scope components.common.header` runs
- **THEN** the CLI SHALL output a hierarchical view of the keys under that namespace for all locales (e.g., dot notation or indented tree)
- **AND** it SHALL support `--locale` filters to focus on a single language.

#### Scenario: Search by substring
- **WHEN** the CLI is invoked with `--contains "Contact"`
- **THEN** it SHALL list all keys whose values contain that substring and show the per-locale values.

### Requirement: Targeted multi-locale updates

Copy editors SHALL be able to update specific keys across languages without touching unrelated content.

#### Scenario: Update command
- **WHEN** `npm run i18n:update components.common.header.cta --value.en "Book a Demo" --value.th "จองการสาธิต" --value.zh "预约演示"` runs
- **THEN** the CLI SHALL load only the JSON segments that contain that key, merge in the new values, and write the key back preserving surrounding structure and formatting
- **AND** it SHALL report any locales that were omitted so humans can fill gaps.

#### Scenario: Partial locale update
- **WHEN** an update command specifies only one locale
- **THEN** the CLI SHALL leave other locales untouched and warn about missing translations.

#### Scenario: Dry run
- **WHEN** the update command runs with `--dry-run`
- **THEN** it SHALL display the diff without mutating files.

### Requirement: Efficient file access

The tooling SHALL avoid reading/writing entire translation files when unnecessary.

#### Scenario: Large file modification
- **WHEN** a file exceeds the configured threshold (e.g., >5,000 lines)
- **THEN** the CLI SHALL stream or use JSON pointer-style access to load only the targeted subtree before writing back the updated fragment.

#### Scenario: Formatting preservation
- **WHEN** the CLI writes changes
- **THEN** it SHALL preserve whitespace, ordering, and comments (if present), making minimal diffs suitable for code review.

### Requirement: Documentation and safety nets

The workflow SHALL include documentation and automated checks so contributors know how to manage translations.

#### Scenario: Contributor guide
- **WHEN** docs are reviewed
- **THEN** `docs/specs/experience/localization-maintenance/spec.md` SHALL reference companion docs (e.g., `docs/how-to/i18n.md`) explaining CLI usage and workflows.

#### Scenario: Tests
- **WHEN** `npm test` runs
- **THEN** there SHALL be unit tests covering the CLI’s tree view and update operations, ensuring they handle nested keys and missing locales.

## Dependencies

- Relies on `next-international` runtime (`src/locales` currently) for locale loading.
- CLI may use libraries like `jsonc-parser` or `ts-morph` for partial file manipulation.
- Works alongside planned internationalization capability (`experience/internationalization`) to ensure consistent translation management.

## Notes & Follow-ups

- Decide whether the canonical format will remain TypeScript modules (manipulated via AST) or move to JSON with a lightweight code-generation step. The CLI design SHALL accommodate the chosen format.
- Consider generating a typed definitions file (`src/i18n/keys.d.ts`) to provide autocomplete and compile-time safety after consolidation.
- If future CMS integration is planned, the CLI design should keep import/export boundaries clear to ease migration.

## Implementation Notes

### Dataset Consolidation (Completed)

**Active Source:** `src/locales/**` (TypeScript modules)
**Deprecated Source:** `src/messages/**` (JSON files) - **REMOVED**

The project now uses a single translation source at `src/locales/`. The deprecated `src/messages/` directory has been removed to prevent confusion and ensure a single source of truth.

### CLI Commands

Three CLI commands have been implemented:

1. **`npm run i18n:verify`** - Verifies translation source configuration
   - Detects active translation dataset from `src/config/locale-config.ts`
   - Fails if dual sources are detected
   - Warns if deprecated directories exist
   - Located: `scripts/i18n-verify.ts`

2. **`npm run i18n:tree`** - Displays translation keys in hierarchical view
   - Supports `--scope`, `--locale`, and `--contains` filters
   - Dynamically imports locale modules
   - Outputs tree structure with translations
   - Located: `scripts/i18n-tree.ts`

3. **`npm run i18n:update`** - Updates translation values across locales
   - Updates TypeScript source files using regex
   - Supports `--dry-run` for previewing changes
   - Reports missing locale translations
   - Preserves formatting and surrounding code
   - Located: `scripts/i18n-update.ts`

### Guardrails

**ESLint Rule:** Added `no-restricted-imports` rule to `.eslintrc.json` that prevents imports from deprecated `src/messages/**` paths with clear error messages directing developers to use `src/locales`.

**CI Integration:** The `i18n:verify` command returns exit code 0 on success and 1 on failure, making it suitable for CI/CD pipeline integration.

### Documentation

Comprehensive CLI usage guide created at `docs/how-to/i18n-cli.md` covering:
- Command syntax and options
- Common workflows
- Best practices
- Troubleshooting
- CI/CD integration examples

### Testing

Test suite created at `scripts/__tests__/i18n-cli.test.ts` covering:
- Verification logic for single vs. dual sources
- Tree building and filtering
- Update operations with nested keys
- Missing locale detection
- Dry-run behavior

### Technical Implementation

- **Language:** TypeScript with `tsx` runner
- **File Manipulation:** Regex-based for TypeScript source updates
- **Module Loading:** Dynamic imports for locale data
- **Key Resolution:** Multi-strategy file path resolution
- **Formatting Preservation:** Minimal diffs suitable for code review
