# @reading-advantage/config/eslint

Shared ESLint v9 flat config for the Reading Advantage monorepo.

## Exports

| Export | Purpose |
|--------|---------|
| `baseConfig` | Base TypeScript + React rules (recommended + hooks) |
| `plugins` | Plugin objects for adding plugin-scoped rules |
| `ignores` | Default ignore patterns (node_modules, .next, dist, coverage) |
| `default` | Combined baseConfig + ignores |

## Usage

### App-level flat config (`eslint.config.mjs`)

```js
import { baseConfig, ignores } from "@reading-advantage/config/eslint";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  { ignores: [".next/", "node_modules/", "prisma/generated/"] },
  ...baseConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
```

### Package-level config

```js
import { baseConfig } from "@reading-advantage/config/eslint";

export default [...baseConfig];
```

## Migration Notes

- All 5 apps migrated from `.eslintrc.json` (v8 legacy) to `eslint.config.mjs` (v9 flat config).
- `FlatCompat` is used only where a plugin has not yet published a flat-config export.
- Apps with Jest/testing-library tests should add those plugin configs manually (see reading-advantage example).
