# Workspace build repair review

## Result

The Medium font dependency issue is resolved.
The bounded build repairs preserve their current contracts.

## Resolved Medium: Keep Advantage Games font inputs inside the app

`apps/advantage-games/src/app/layout.tsx` imports font files from the WWW app.
Advantage Games declares no dependency on that app.
The root Turbo build inputs contain `$TURBO_DEFAULT$` and `.env*`.
They do not include the external font files.
A WWW font change therefore does not invalidate the Advantage Games build cache.

Copy the existing font bytes into Advantage Games.
Use paths relative to its layout.
This preserves offline builds without adding a shared package or expanding cache configuration.

## Accepted changes

The utils package exposes the structured logger through a dedicated ESM subpath.
Both build scripts include its JavaScript and declaration output.
All ten changed routes use that subpath.
The three consuming apps already declare the utils dependency.
The dedicated entrypoint avoids importing React hooks through the package root.

The final Accounts import targets the compiled private backend adapter.
Its nested ESM imports resolve within the same compiled tree as the backend package.
The adapter and its route bindings use the same compiled request-context module.
Accounts already declares the backend dependency, so Turbo builds that dependency first.
The standalone tracing root includes the workspace.
The change does not broaden the public package interface.
The implementation agent reported seven passing route boundary tests.

The installed Next.js source rejects Proxy runtime segment configuration.
It explicitly states that Proxy runs on Node.js.
Removing Primary's runtime export therefore preserves the required runtime.

The local font configuration preserves both CSS variable names and the weight range.
The corrected layout reads both fonts from `apps/advantage-games/src/fonts`.
Byte comparisons confirm that both copies match the established WWW font files.
The added layout assertion checks local paths, variable names, and weight ranges.
The implementation agent reported three passing layout tests.
No unresolved build repair finding remains.

## Verification limits

The review inspected package exports, build scripts, route imports, app configuration, and installed Next.js source.
It ran no build, type check, lint process, or full test suite.
The parent owns the running workspace build.
