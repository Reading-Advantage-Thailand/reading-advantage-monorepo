# Track: Live Content Rotation and Pack Management

## Overview

Establish a repeatable workflow for rotating sentence and vocabulary content packs so active games can refresh content without code churn.

## Functional Requirements

- Define content-pack metadata format and versioning convention.
- Support selecting active packs per game or cohort.
- Add validation checks for pack completeness and integrity.
- Document weekly rotation process for operators.

## Non-Functional Requirements

- Rotation workflow must be deterministic and auditable.
- Pack loading must not increase game startup failures.

## Acceptance Criteria

- [x] Pack metadata schema is defined and documented.
- [x] Rotation mechanism supports enabling/disabling packs safely.
- [x] Invalid packs are rejected with actionable errors.
- [x] Operational rotation checklist is added to project docs.

## Content Pack Schema (v2 Format)

```typescript
interface ContentPackMetadata {
  packId: string       // Required: Unique identifier (e.g., "vocab-beginner-001")
  version: string      // Required: Semver format (e.g., "1.0.0")
  items: VocabularyItem[]  // Required: Array of vocabulary/sentence items
  name?: string        // Optional: Human-readable name
  description?: string // Optional: Pack description
  gameType?: 'vocabulary' | 'sentence'  // Optional: Content type
  difficulty?: 'easy' | 'normal' | 'hard' | 'extreme'  // Optional: Difficulty tier
  active?: boolean     // Optional: Whether pack is active (default: true)
  language?: string    // Optional: ISO language code
  createdAt?: string  // Optional: ISO timestamp
  updatedAt?: string  // Optional: ISO timestamp
  tags?: string[]     // Optional: Searchable tags
  author?: string     // Optional: Pack author
}
```

### Vocabulary Item Format

```typescript
interface VocabularyItem {
  term: string      // Required: The word/sentence
  translation: string  // Required: Translation
  id?: string       // Optional: Unique item ID
}
```

### Versioning Convention

- **Format**: Semantic Versioning (semver) - `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes (e.g., removing fields, changing semantics)
- **MINOR**: Backward-compatible additions (e.g., new optional fields)
- **PATCH**: Bug fixes (e.g., correcting translations)

### Legacy Format (v1)

Legacy packs use a simple array format without metadata:

```typescript
VocabularyItem[]  // Array of {term, translation} objects
```

Legacy packs are auto-converted to v2 format on validation.

### Deprecation Rules

1. **Legacy Pack Warnings**: Legacy v1 packs generate a warning recommending migration to v2
2. **Minimum Items**: Content packs must contain at least 5 items for gameplay
3. **Required Fields**: Missing required fields (packId, version, items) reject the pack
4. **Semver Enforcement**: Invalid version strings are rejected

### Validation Error Examples

| Error Code | Message | Fix |
|------------|---------|-----|
| MISSING_PACK_ID | Content pack missing required field: packId | Add a unique packId to your content pack |
| INVALID_VERSION | Version must be valid semver (e.g., 1.0.0) | Update version to proper semver format |
| EMPTY_ITEMS | Content pack items array cannot be empty | Add vocabulary items to the items array |
| INSUFFICIENT_ITEMS | Must have at least 5 items for gameplay | Add more vocabulary items to reach minimum of 5 |
| UNKNOWN_FIELD | Content pack has unknown field: xyz | Remove or rename unknown field |

## Out of Scope

- Authoring new curriculum content.
- External CMS integration.

