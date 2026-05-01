# i18n CLI Usage Guide

This guide explains how to use the i18n CLI tools for managing translations in the Reading Advantage project.

## Overview

The i18n CLI provides three commands for managing translations:
- `i18n:verify` - Verify translation source configuration
- `i18n:tree` - Display translation keys in a tree view
- `i18n:update` - Update translation values across locales

## Prerequisites

All translation files are located in `src/locales/` and use TypeScript modules. The CLI tools require:
- Node.js 18+
- npm packages installed (`npm install`)

## Commands

### i18n:verify

Verifies that the project uses a single translation source and detects configuration issues.

```bash
npm run i18n:verify
```

**What it checks:**
- Verifies `src/locales` is the active translation source
- Fails if both `src/locales` and `src/messages` are imported
- Warns if deprecated directories exist
- Ensures the source directory exists

**Exit codes:**
- `0` - Verification passed
- `1` - Verification failed (errors detected)

**Example output:**
```
🔍 i18n Source Verification

==================================================

✓ Active source: src/locales

✅ Verification passed!

The application uses a single translation source: src/locales

==================================================
```

**When to use:**
- Before starting content updates
- In CI/CD pipelines
- After modifying locale configuration

---

### i18n:tree

Displays translation keys in a hierarchical tree view with filtering options.

```bash
npm run i18n:tree [options]
```

**Options:**
- `--scope <path>` - Filter keys by namespace (e.g., `pages.home`, `components.common`)
- `--locale <locale>` - Show values only for specified locale (`en`, `th`, `zh`)
- `--contains <text>` - Search for keys with values containing the specified text
- `--help` - Show help message

**Examples:**

1. **Show all translation keys:**
   ```bash
   npm run i18n:tree
   ```

2. **Show keys for a specific page:**
   ```bash
   npm run i18n:tree -- --scope pages.home
   ```

3. **Show English translations only:**
   ```bash
   npm run i18n:tree -- --locale en
   ```

4. **Search for specific text:**
   ```bash
   npm run i18n:tree -- --contains "Contact Us"
   ```

5. **Combine filters:**
   ```bash
   npm run i18n:tree -- --scope components.common --locale th
   ```

**Example output:**
```
🌳 i18n Translation Tree

==================================================

📂 Scope: components.common.header
🌍 Locale: en

==================================================

└── components/
    └── common/
        └── header/
            ├── navigationMenu
            │     [en] Navigation Menu
            ├── contactUs
            │     [en] Contact Us
            └── openMenu
                  [en] Open menu

==================================================
```

**When to use:**
- Finding where specific text is used
- Understanding translation structure
- Checking translation coverage
- Locating keys before updating

---

### i18n:update

Updates translation values across one or more locales.

```bash
npm run i18n:update <key> [options]
```

**Arguments:**
- `<key>` - Dot-notation key path (e.g., `components.common.header.cta`)

**Options:**
- `--value.<locale> "text"` - Set value for specific locale (`en`, `th`, `zh`)
- `--dry-run` - Preview changes without writing files
- `--help` - Show help message

> ℹ️ The updater now parses locale files with TypeScript’s AST, so only the targeted string literal is rewritten (no regex-based file rewrites).

**Examples:**

1. **Update single locale:**
   ```bash
   npm run i18n:update components.common.header.cta -- --value.en "Book Demo"
   ```

2. **Update multiple locales:**
   ```bash
   npm run i18n:update pages.home.title -- --value.en "Welcome" --value.th "ยินดีต้อนรับ" --value.zh "欢迎"
   ```

3. **Preview changes without writing:**
   ```bash
   npm run i18n:update components.footer.copyright -- --value.en "© 2025" --dry-run
   ```

**Example output:**
```
📝 i18n Update Tool

==================================================

🔑 Key: components.common.header.contactUs
⚠️  DRY RUN MODE - No files will be modified

==================================================

Results:

  [en] ✅ Updated: "Contact Us" → "Get in Touch"

⚠️  Missing translations for locales:
  - th: Translation not provided
  - zh: Translation not provided

==================================================

💡 Run without --dry-run to apply these changes
```

**Exit codes:**
- `0` - Update succeeded
- `1` - Update failed (key not found or file errors)

**When to use:**
- Updating marketing copy
- Fixing typos across locales
- Refreshing outdated translations
- Maintaining translation consistency

---

## Workflows

### Updating a Single Page

```bash
# 1. Find the keys you need to update
npm run i18n:tree -- --scope pages.home

# 2. Preview the change
npm run i18n:update pages.home.title -- --value.en "New Title" --dry-run

# 3. Apply the change
npm run i18n:update pages.home.title -- --value.en "New Title"

# 4. Verify with tree view
npm run i18n:tree -- --scope pages.home --locale en
```

### Updating Multiple Locales

```bash
# Update all three locales at once
npm run i18n:update components.common.footer.copyright -- \
  --value.en "© 2025 Reading Advantage" \
  --value.th "© 2025 Reading Advantage" \
  --value.zh "© 2025 Reading Advantage"
```

### Finding and Updating Text

```bash
# 1. Search for the text
npm run i18n:tree -- --contains "Contact"

# 2. Update the found key
npm run i18n:update components.common.header.contactUs -- \
  --value.en "Get in Touch" \
  --value.th "ติดต่อเรา"
```

### Pre-deployment Verification

```bash
# Verify configuration before deploying
npm run i18n:verify

# Check that all expected keys exist
npm run i18n:tree -- --scope pages
npm run i18n:tree -- --scope components
```

---

## Best Practices

1. **Always use --dry-run first**: Preview changes before applying them
   ```bash
   npm run i18n:update key -- --value.en "text" --dry-run
   ```

2. **Update all locales together**: Avoid partial translations when possible
   ```bash
   npm run i18n:update key -- --value.en "EN" --value.th "TH" --value.zh "ZH"
   ```

3. **Verify changes**: Use `i18n:tree` to confirm updates
   ```bash
   npm run i18n:tree -- --scope pages.home
   ```

4. **Run verify in CI**: Add to CI pipeline to prevent configuration drift
   ```yaml
   - name: Verify i18n configuration
     run: npm run i18n:verify
   ```

5. **Document missing translations**: Track incomplete locales in issue comments

6. **Test locally**: Run `npm run dev` after updates to see changes

---

## Troubleshooting

### "Key not found in file"

**Problem:** The update command can't find the key in the expected file.

**Solutions:**
1. Use `i18n:tree` to find the correct key path
2. Check that the key exists in the locale file
3. Verify the file structure matches the key path

### "Could not find locale file"

**Problem:** The CLI can't determine which file contains the key.

**Solutions:**
1. Check that `src/locales/<locale>.ts` exists
2. Verify the key matches the file structure
3. Ensure the key path is correct (use `i18n:tree` to verify)

### "Verification failed - dual sources detected"

**Problem:** Both `src/locales` and `src/messages` are imported.

**Solutions:**
1. Check `src/config/locale-config.ts`
2. Ensure only `src/locales` is referenced
3. Remove any `src/messages` imports

### ESLint error about importing from messages

**Problem:** ESLint blocks imports from deprecated `src/messages` path.

**Solution:**
```typescript
// ❌ Don't do this
import { messages } from '@/messages/en';

// ✅ Do this instead
import { useI18n } from '@/locales/client';
```

---

## Technical Details

### File Structure

```
src/
├── locales/
│   ├── en.ts              # Root English locale
│   ├── th.ts              # Root Thai locale
│   ├── zh.ts              # Root Chinese locale
│   ├── client.ts          # Client-side i18n setup
│   ├── server.ts          # Server-side i18n setup
│   ├── pages/
│   │   ├── home.ts
│   │   ├── about.ts
│   │   └── products/
│   │       └── math-advantage.ts
│   └── components/
│       ├── common/
│       │   ├── header.ts
│       │   ├── footer.ts
│       │   └── navigation.ts
│       └── pricing-table.ts
└── config/
    └── locale-config.ts   # Locale configuration
```

### Key Resolution

The CLI resolves keys by trying multiple file paths in order:

1. Full path from key segments: `pages.home.title` → `src/locales/pages/home.ts`
2. Parent segments: `pages.home.title` → `src/locales/pages.ts`
3. Root locale file: `pages.home.title` → `src/locales/en.ts`

### Update Strategy

The update command:
1. Locates the file containing the key
2. Reads the TypeScript source
3. Uses regex to find and replace the value
4. Preserves formatting and surrounding code
5. Writes the updated content back (unless --dry-run)

---

## Integration

### CI/CD Pipeline

Add verification to your CI pipeline:

```yaml
name: i18n Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run i18n:verify
```

### Pre-commit Hook

Add a pre-commit hook to verify translations:

```bash
#!/bin/sh
npm run i18n:verify
```

---

## Related Documentation

- [Localization Maintenance Spec](../specs/experience/localization-maintenance/spec.md)
- [Project Brief](../project-brief.md)
- [PRD - Internationalization](../prd.md)

---

## Support

If you encounter issues with the i18n CLI:
1. Check this guide for troubleshooting steps
2. Review the spec at `docs/specs/experience/localization-maintenance/spec.md`
3. Open an issue with:
   - Command that failed
   - Full error output
   - Expected vs. actual behavior
