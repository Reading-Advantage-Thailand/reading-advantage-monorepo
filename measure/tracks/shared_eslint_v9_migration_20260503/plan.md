# Plan: Shared ESLint v9 Flat Config Migration

- [ ] Write tests for shared ESLint config plugin resolution (verifies all plugins load)
- [ ] Fix pnpm workspace plugin resolution in packages/config/eslint
- [ ] Write tests for reading-advantage flat config compatibility
- [ ] Create `eslint.config.mjs` for reading-advantage (migrate from .eslintrc.json)
- [ ] Remove `.eslintrc.json` from reading-advantage
- [ ] Update reading-advantage package.json lint script to use flat config
- [ ] Verify all 5 apps use shared config (audit import statements)
- [ ] Run `pnpm turbo run lint` across all apps
- [ ] Fix any remaining plugin resolution errors
- [ ] Document shared ESLint config usage in packages/config/eslint/README.md
