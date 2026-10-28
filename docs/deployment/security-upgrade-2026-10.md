# Security upgrade redeploy list

This list supports Daniel's team after Daniel approves the push of master. Use master at commit `3a10dd68ca6cb36301f1a9246b22c7e9685a7040` or a later master commit that contains it. This commit changes `pnpm-lock.yaml`.

The push of master starts `.github/workflows/cd-www-reading-advantage.yml`. Its path triggers include `apps/www-reading-advantage/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `turbo.json`. This commit changes `pnpm-lock.yaml`, so the workflow starts at once.

| Service | Coverage and check |
| --- | --- |
| www-reading-advantage | app=`apps/www-reading-advantage`; commit=3a10dd68ca6cb36301f1a9246b22c7e9685a7040 | order=1 | traffic=direct (`apps/www-reading-advantage/cloudbuild.yaml`, deploy step); live=unknown (no repo record); check=GET `/en` — source: `apps/www-reading-advantage/src/app/[locale]/(marketing)/(home)/page.tsx`. |
| accounting | app=`apps/accounting`; commit=3a10dd68ca6cb36301f1a9246b22c7e9685a7040 | order=2 | traffic=conditional: no-traffic for an existing service, direct for first creation (`apps/accounting/cloudbuild.yaml`, deploy step); live=unknown (no repo record); check=GET `/login` — source: `apps/accounting/app/login/page.tsx`. |
| accounts | app=`apps/accounts`; commit=3a10dd68ca6cb36301f1a9246b22c7e9685a7040 | order=3 | traffic=direct (`apps/accounts/cloudbuild.yaml`, deploy step); live=unknown (no repo record); check=GET `/.well-known/openid-configuration` — source: `apps/accounts/app/.well-known/openid-configuration/route.ts`. |
| workbooks | app=`apps/workbooks`; commit=3a10dd68ca6cb36301f1a9246b22c7e9685a7040 | order=4 | traffic=direct (`apps/workbooks/cloudbuild.yaml`, deploy step); live=unknown (no repo record); check=GET `/drafts` — source: `apps/workbooks/app/drafts/page.tsx`. |
| sales-advantage | app=`apps/sales-advantage`; commit=3a10dd68ca6cb36301f1a9246b22c7e9685a7040 | order=5 | traffic=no-traffic for the candidate revision (`apps/sales-advantage/cloudbuild.yaml`, candidate deploy step); live=unknown (no repo record); check=GET `/en` — source: `apps/sales-advantage/app/[locale]/page.tsx`. |
| storytime-app | app=`apps/storytime`; commit=3a10dd68ca6cb36301f1a9246b22c7e9685a7040 | order=6 | traffic=no-traffic (`apps/storytime/cloudbuild.yaml`); live=storytime-app-00008-tmb (the void build); source: `measure/tracks/storytime_app_rebuild_20261025/spec.md` section 2.3; precondition=apps/storytime/cloudbuild.yaml uses --no-traffic and a revision tag. Move traffic only after Daniel's Storytime go. Storytime on master holds rebuild work that has not passed Measure acceptance; check=GET `/en/st/l2/w01` — source: `apps/storytime/app/[locale]/st/[level]/[week]/page.tsx`. |
| marketing | app=`apps/marketing`; commit=3a10dd68ca6cb36301f1a9246b22c7e9685a7040 | order=7 | traffic=no-traffic (`apps/marketing/cloudbuild.yaml`, candidate deploy step); live=unknown (no repo record); check=GET `/login` — source: `apps/marketing/app/login/page.tsx`. |
| codecamp-advantage | app=`apps/codecamp-advantage`; commit=3a10dd68ca6cb36301f1a9246b22c7e9685a7040 | order=8 | traffic=no-traffic (`apps/codecamp-advantage/cloudbuild.yaml`, candidate deploy step); live=unknown (no repo record); check=GET `/en` — source: `apps/codecamp-advantage/app/[locale]/page.tsx`. |
| primary-advantage-app | app=`apps/primary-advantage`; commit=3a10dd68ca6cb36301f1a9246b22c7e9685a7040 | order=9 | traffic=direct (`apps/primary-advantage/cloudbuild.yaml`, deploy step); live=primary-advantage-app-00141-nuh (tag approved), built from `9b05216d7` (branch `test/help-qr-3005`); source: Monorepo orchestrator record of 2026-10-23; precondition=wait until master holds the approved in-app help work (track `primary_in_app_help_20261023`, task 6.3 says the help ships with the next Primary deploy), or until Daniel names another source. A deploy from this commit alone removes the live in-app help. check=GET `/_next/image?url=%2Fprimary-advantage.png&w=640&q=75` — source file: `apps/primary-advantage/public/primary-advantage.png`; expected status 200. |
| reading-advantage-web | NOT COVERED by this commit; reason=the service builds from the legacy repository, not this monorepo. Its live image uses `FROM node:20.18` at `web/Dockerfile` line 2 in the legacy repository (read-only check 2026-10-27, legacy HEAD `a2b38df9`); owner=the legacy repository owner. The PM assigns the patch session in a separate assignment. |

## Runtime note

`node:22-alpine` needs no tag change. A rebuild pulls Node `22.23.4`. `apps/reading-advantage/Dockerfile` stays on `node:20.18` until Daniel decides. The live `reading-advantage-web` image uses `node:20.18` from the legacy repository, not that monorepo Dockerfile.

## Review inputs applied

- The order puts the lowest-traffic services first and keeps `primary-advantage-app` last.
- The www workflow triggers on the listed paths, including the lockfile and workspace packages.
- The Primary live revision and its in-app help precondition come from the orchestrator record.
- The Storytime live revision and traffic gate come from its Measure specification and Cloud Build file.
- Each covered service has one GET path and a source file. The Primary image check names an existing public file.
- The legacy Reading service is marked not covered and has no app, commit, order, or check label.
- The runtime note preserves both Node base-image lines.

The table gives the team a redeploy order and checks. It does not report that any service has changed.
