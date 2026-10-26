/**
 * The dependency version-guard list for the security upgrade track.
 *
 * One row per (package, line prefix) pair. The test reads this list and scans
 * the `packages:` section of `pnpm-lock.yaml`. A row fails while a locked
 * version that starts with `linePrefix` sits below `fixedVersion`. Absence of
 * the line fails closed (`requirePresent` is true on every row).
 *
 * Version bumps stay patch or minor only. The MAJOR bumps of the spec stay out
 * of scope and must not appear here (the test asserts that).
 * A package with no patched release lives in NO_FIX_AVAILABLE, not here.
 */
export interface GuardEntry {
  /** The GitHub advisory IDs this row guards. Each id appears in the failure message. */
  advisoryIds: string[];
  /** The package name exactly as written in the lockfile key. */
  packageName: string;
  /** A version prefix that selects one line (for example `4.` selects zod 4 only). Empty selects every line. */
  linePrefix: string;
  /** The minimum acceptable version for the selected line. */
  fixedVersion: string;
  /** Absence of the guarded line must fail. Every row sets this to true. */
  requirePresent: boolean;
}

export const GUARD_ENTRIES: GuardEntry[] = [
  {
    advisoryIds: [
      "GHSA-2464-fhr4-w9xw",
      "GHSA-2xp9-vwfh-vxw4",
      "GHSA-673q-mjm6-r5xr",
      "GHSA-6gpp-xcg3-4w24",
      "GHSA-89xv-2m56-2m9x",
      "GHSA-cjq9-62q9-8jv4",
      "GHSA-m99w-x7hq-7vfj",
      "GHSA-p293-qw3h-jr36",
      "GHSA-p3m5-59mp-jv5r",
      "GHSA-p9j2-gv94-2wf4",
      "GHSA-vcvr-r3jv-pc5j",
    ],
    packageName: "next",
    linePrefix: "",
    fixedVersion: "16.4.1",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-h3gv-c5rc-p453"],
    packageName: "react",
    linePrefix: "19.2.",
    fixedVersion: "19.2.9",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-h3gv-c5rc-p453"],
    packageName: "react-dom",
    linePrefix: "19.2.",
    fixedVersion: "19.2.9",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-f88m-g3jw-g9cj", "GHSA-rgj7-g3m4-5g8c", "GHSA-wq5f-xc86-pv6w"],
    packageName: "sharp",
    linePrefix: "",
    fixedVersion: "0.35.5",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-8r5x-fm3f-whwj", "GHSA-p8wg-vrv2-v86f"],
    packageName: "handlebars",
    linePrefix: "",
    fixedVersion: "4.7.10",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-mchm-gjx6-7h55"],
    packageName: "@sentry/nextjs",
    linePrefix: "",
    fixedVersion: "10.75.2",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-587h-7wmj-h5pm"],
    packageName: "vite",
    linePrefix: "8.1.",
    fixedVersion: "8.1.6",
    requirePresent: true,
  },
  {
    advisoryIds: [
      "GHSA-3pq3-5fj3-cg6v",
      "GHSA-542g-h47m-68v8",
      "GHSA-c29m-xwm3-cm6r",
      "GHSA-m8m8-qj5v-23w3",
      "GHSA-mghh-pgcx-3jjj",
      "GHSA-r4gj-5m52-g5wh",
      "GHSA-x97p-jq2g-jp4f",
    ],
    packageName: "axios",
    linePrefix: "1.",
    fixedVersion: "1.20.0",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-28wg-ghj8-5hjv", "GHSA-2v37-7h3g-55p8"],
    packageName: "nanoid",
    linePrefix: "5.",
    fixedVersion: "5.1.16",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-28wg-ghj8-5hjv", "GHSA-2v37-7h3g-55p8"],
    packageName: "nanoid",
    linePrefix: "3.",
    fixedVersion: "3.3.18",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-6g55-p6wh-862q", "GHSA-r28c-9q8g-f849"],
    packageName: "postcss",
    linePrefix: "",
    fixedVersion: "8.5.18",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-4cwx-7wf7-3272", "GHSA-rfgv-xxqx-mfg5", "GHSA-w293-vg96-wgc3", "GHSA-xjj6-f33q-929c"],
    packageName: "undici",
    linePrefix: "7.",
    fixedVersion: "7.30.1",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-mrhx-c7xc-m3w5"],
    packageName: "zod",
    linePrefix: "4.",
    fixedVersion: "4.6.6",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-x8mw-p69m-v3mx", "GHSA-xjh9-v7x6-24jw"],
    packageName: "@fastify/busboy",
    linePrefix: "3.",
    fixedVersion: "3.2.1",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-m9gg-hp2v-232j"],
    packageName: "@grpc/grpc-js",
    linePrefix: "1.",
    fixedVersion: "1.14.5",
    requirePresent: true,
  },
  {
    advisoryIds: [
      "GHSA-27p8-2357-5qqv",
      "GHSA-3px3-54cx-rmw9",
      "GHSA-4w3w-2rp5-g8jm",
      "GHSA-6mj3-qw4j-hgrw",
      "GHSA-8344-3jmq-59r6",
      "GHSA-93r5-fhx6-vmg9",
      "GHSA-965w-775f-mr7g",
      "GHSA-c7q8-3ch8-vqpv",
      "GHSA-g53g-w8rj-fmg7",
      "GHSA-vr34-hp96-76pp",
      "GHSA-w2rr-34g9-rvrj",
    ],
    packageName: "@xmldom/xmldom",
    linePrefix: "0.9.",
    fixedVersion: "0.9.12",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-3jxr-9vmj-r5cp", "GHSA-6j4f-fj2g-mc7p", "GHSA-mh99-v99m-4gvg", "GHSA-qhr7-859c-m2p7", "GHSA-rgw5-rvv9-x895"],
    packageName: "brace-expansion",
    linePrefix: "1.",
    fixedVersion: "1.1.20",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-3jxr-9vmj-r5cp", "GHSA-6j4f-fj2g-mc7p", "GHSA-mh99-v99m-4gvg", "GHSA-qhr7-859c-m2p7", "GHSA-rgw5-rvv9-x895"],
    packageName: "brace-expansion",
    linePrefix: "2.",
    fixedVersion: "2.1.6",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-3jxr-9vmj-r5cp", "GHSA-6j4f-fj2g-mc7p", "GHSA-mh99-v99m-4gvg", "GHSA-qhr7-859c-m2p7", "GHSA-rgw5-rvv9-x895"],
    packageName: "brace-expansion",
    linePrefix: "5.",
    fixedVersion: "5.0.11",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-73wf-gq98-2v4g", "GHSA-c83g-rgw3-j3cx"],
    packageName: "browserslist",
    linePrefix: "4.",
    fixedVersion: "4.28.7",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-vc2v-76pw-4v95"],
    packageName: "compression",
    linePrefix: "1.",
    fixedVersion: "1.8.2",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-4c8g-83qw-93j6", "GHSA-7p8r-x3mc-p8w7", "GHSA-f65p-4m7j-42xc", "GHSA-fph4-wmhf-6fwf", "GHSA-jqff-g426-hqxp", "GHSA-qw65-cvwx-89v3", "GHSA-v2hh-gcrm-f6hx"],
    packageName: "fast-uri",
    linePrefix: "3.",
    fixedVersion: "3.1.7",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-8r6m-32jq-jx6q"],
    packageName: "fast-xml-parser",
    linePrefix: "5.",
    fixedVersion: "5.10.1",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-8r9p-f939-6h3c", "GHSA-q3jh-wrc6-jgq8"],
    packageName: "follow-redirects",
    linePrefix: "1.",
    fixedVersion: "1.16.1",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-5p2g-fcmc-qvqq", "GHSA-w3rx-r6r6-pgpr"],
    packageName: "image-size",
    linePrefix: "2.",
    fixedVersion: "2.0.3",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-mwp4-54f8-5fhr"],
    packageName: "ip-address",
    linePrefix: "10.",
    fixedVersion: "10.3.1",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-2883-xcg3-v3hh", "GHSA-52cp-r559-cp3m", "GHSA-5p4m-2wfm-xmqj"],
    packageName: "js-yaml",
    linePrefix: "3.",
    fixedVersion: "3.15.2",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-2883-xcg3-v3hh", "GHSA-52cp-r559-cp3m", "GHSA-5p4m-2wfm-xmqj"],
    packageName: "js-yaml",
    linePrefix: "4.",
    fixedVersion: "4.3.2",
    requirePresent: true,
  },
  {
    advisoryIds: ["GHSA-68fv-2mgg-jv7q"],
    packageName: "source-map-js",
    linePrefix: "1.",
    fixedVersion: "1.2.2",
    requirePresent: true,
  },
];

/**
 * Advisories with no patched release. The floor list must not name these
 * packages. `fixedVersion` is null. The range is the vulnerable range.
 * `directParent` is the lockfile package that depends on the vulnerable package.
 * `consumer` is the workspace package at the top of that chain.
 */
export interface NoFixAvailable {
  /** The GitHub advisory IDs for this package. */
  advisoryIds: string[];
  /** The package name exactly as written in the lockfile key. */
  packageName: string;
  /** The vulnerable range. No patched release exists above this range. */
  vulnerableRange: string;
  /** No patched version exists. This value stays null. */
  fixedVersion: null;
  /** The lockfile package that depends on the vulnerable package. */
  directParent: string;
  /** The workspace package at the top of the lockfile chain. */
  consumer: string;
}

export const NO_FIX_AVAILABLE: NoFixAvailable[] = [
  {
    advisoryIds: ["GHSA-7pqw-9j4j-h8q3", "GHSA-jmr9-qjv8-65gv"],
    packageName: "extract-zip",
    vulnerableRange: "<= 2.0.1",
    fixedVersion: null,
    directParent: "@puppeteer/browsers@2.6.1",
    consumer: "apps/www-reading-advantage through @revideo/renderer@0.10.4 and puppeteer@23.11.1",
  },
  {
    advisoryIds: ["GHSA-v4rh-8p82-6h5w"],
    packageName: "url-regex",
    vulnerableRange: "<= 5.0.0",
    fixedVersion: null,
    directParent: "text-preprocessor@1.1.1",
    consumer: "packages/reading-advantage-scripts through vocabulary-level-grader@1.1.0 and extract-lemmatized-nonstop-words@1.0.19",
  },
];

/**
 * Open majors that stay out of scope. The floor test never asserts them. Each
 * entry records the advisory, the locked and fixed versions, and why the major
 * stays open. A 0.x jump to a new line (for example the OpenTelemetry 2
 * migration) is a major, not a patch or minor.
 */
export interface OpenMajor {
  /** The GitHub advisory IDs that name this package. */
  advisoryIds: string[];
  /** The package name exactly as written in the lockfile key. */
  packageName: string;
  /** The locked version in the current lockfile. */
  lockedVersion: string;
  /** The fixed version that is out of scope because it is a major. */
  fixedVersion: string;
  /** Why the major stays open. */
  reason: string;
}

export const OPEN_MAJORS: OpenMajor[] = [
  {
    advisoryIds: ["GHSA-q7rr-3cgh-j5r3"],
    packageName: "@opentelemetry/sdk-node",
    lockedVersion: "0.57.2",
    fixedVersion: "0.217.0",
    reason: "OpenTelemetry 2 migration, spec §6",
  },
  {
    advisoryIds: ["GHSA-q7rr-3cgh-j5r3"],
    packageName: "@opentelemetry/exporter-prometheus",
    lockedVersion: "0.57.2",
    fixedVersion: "0.217.0",
    reason: "OpenTelemetry 2 migration, spec §6",
  },
];