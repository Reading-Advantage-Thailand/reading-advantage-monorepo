# @reading-advantage/practice-core

Domain-neutral practice submission, timing, rating, item, and evidence
contracts for every Advantage application. Curriculum and UI stay in consumers.

The authoritative `kst-srs.v3.2` compatibility mapping lives in
`packages/mastery-runtime-compat/runtime-manifest.json`. Land normative fixtures
before behavioral changes, version public contract breaks with semver, and run
the packed-consumer gate before release. Published consumers must use exact
compatible versions, never `*` or `latest`.
