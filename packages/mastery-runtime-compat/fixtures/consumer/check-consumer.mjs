import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const [gatePath, descriptorPath] = globalThis.process.argv.slice(2);
if (!gatePath || !descriptorPath) {
  throw new Error(
    "Expected the built compatibility gate and consumer descriptor paths.",
  );
}

const SALES_PACKAGE_NAME = "@reading-advantage/sales-knowledge";
const SALES_PACKAGE_VERSION = "0.1.0";
const SALES_VERIFIER_EXPORT = "verifySalesReleaseEvidence";
const SALES_EVIDENCE_MANIFEST_EXPORT = "salesReleaseEvidenceManifest";
const GATE_ZOD_VERSION = "3.25.76";
const ENGINE_ZOD_VERSION = "4.4.3";
const TS_FSRS_VERSION = "5.4.1";

/** Returns whether a path is a strict descendant of a directory. */
function isStrictlyInside(parent, candidate) {
  const child = relative(parent, candidate);
  return (
    child !== "" &&
    child !== ".." &&
    !child.startsWith(`..${sep}`) &&
    !isAbsolute(child)
  );
}

/** Confirms an in-consumer path is an ordinary file whose real path remains in the consumer. */
async function assertSafeConsumerFile(path, label) {
  const consumerRoot = resolve(globalThis.process.cwd());
  const consumerRealPath = await realpath(consumerRoot);
  const candidate = resolve(path);
  if (!isStrictlyInside(consumerRoot, candidate)) {
    throw new Error(
      `${label} must resolve inside the clean consumer directory.`,
    );
  }
  const before = await lstat(candidate);
  if (!before.isFile()) {
    throw new Error(
      `${label} must be a regular file, not a symlink or directory.`,
    );
  }
  const candidateRealPath = await realpath(candidate);
  if (!isStrictlyInside(consumerRealPath, candidateRealPath)) {
    throw new Error(
      `${label} real path must remain inside the clean consumer directory.`,
    );
  }
  const after = await lstat(candidate);
  if (
    !after.isFile() ||
    after.dev !== before.dev ||
    after.ino !== before.ino ||
    after.size !== before.size ||
    after.mtimeMs !== before.mtimeMs
  ) {
    throw new Error(
      `${label} changed while its containment was being checked.`,
    );
  }
  return candidate;
}

/** Reads a validated regular file and rejects a source swap during the read. */
async function readSafeConsumerFile(path, label) {
  const candidate = await assertSafeConsumerFile(path, label);
  const before = await lstat(candidate);
  const bytes = await readFile(candidate);
  const after = await lstat(candidate);
  if (
    !after.isFile() ||
    after.dev !== before.dev ||
    after.ino !== before.ino ||
    after.size !== before.size ||
    after.mtimeMs !== before.mtimeMs
  ) {
    throw new Error(`${label} changed while it was being read.`);
  }
  return bytes;
}

/** Reads and parses a package manifest only after consumer containment checks. */
async function readSafeJson(path, label) {
  const bytes = await readSafeConsumerFile(path, label);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** Finds a package manifest using Node's consumer-side ancestor resolution order. */
async function findResolvedPackageManifest(entryUrl, packageName) {
  const consumerRoot = resolve(globalThis.process.cwd());
  let current = dirname(fileURLToPath(entryUrl));
  while (current === consumerRoot || isStrictlyInside(consumerRoot, current)) {
    const manifestPath = resolve(
      current,
      "node_modules",
      packageName,
      "package.json",
    );
    try {
      const manifest = await readSafeJson(
        manifestPath,
        `${packageName} resolved package manifest`,
      );
      if (manifest.name === packageName) return manifest;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Unable to locate resolved ${packageName} from ${entryUrl}`);
}

/** Reads the checked-in descriptor bytes only after regular-file and containment checks. */
async function readConsumerDescriptor(path) {
  const bytes = await readSafeConsumerFile(path, "Consumer descriptor");
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(
      `Consumer descriptor is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** Reads the packed Sales package metadata adjacent to its public entrypoint. */
async function readSalesPackageManifest(entryUrl) {
  const manifestPath = fileURLToPath(
    new globalThis.URL("../package.json", entryUrl),
  );
  const bytes = await readFile(manifestPath);
  return JSON.parse(bytes.toString("utf8"));
}

/** Verifies the Sales knowledge package through its public evidence verifier. */
async function verifySalesKnowledge(descriptor) {
  if (descriptor.name !== "sales-advantage") return null;
  const identity = descriptor.salesKnowledge;
  if (
    !identity ||
    identity.package?.name !== SALES_PACKAGE_NAME ||
    identity.package?.version !== SALES_PACKAGE_VERSION ||
    identity.verifierExport !== SALES_VERIFIER_EXPORT ||
    identity.evidenceManifestExport !== SALES_EVIDENCE_MANIFEST_EXPORT
  ) {
    throw new Error(
      "Sales consumer descriptor has no valid public knowledge identity.",
    );
  }

  const packageEntryUrl = await import.meta.resolve(SALES_PACKAGE_NAME);
  const knowledge = await import(packageEntryUrl);
  const packageManifest = await readSalesPackageManifest(packageEntryUrl);
  const verifier = knowledge[SALES_VERIFIER_EXPORT];
  const evidenceManifest = knowledge[SALES_EVIDENCE_MANIFEST_EXPORT];
  if (typeof verifier !== "function" || !evidenceManifest) {
    throw new Error(
      "Packed Sales knowledge public verifier or evidence manifest is unavailable.",
    );
  }
  if (
    packageManifest.name !== SALES_PACKAGE_NAME ||
    packageManifest.version !== SALES_PACKAGE_VERSION
  ) {
    throw new Error(
      "Packed Sales knowledge package metadata is not the admitted release.",
    );
  }
  const expectedEvidence = {
    releaseCandidateByteSha256:
      evidenceManifest.evidence?.releaseCandidate?.byteSha256,
    approvalByteSha256: evidenceManifest.evidence?.approval?.byteSha256,
    staticSeedByteSha256: evidenceManifest.evidence?.staticSeed?.byteSha256,
    graphCanonicalSha256: evidenceManifest.artifacts?.graphCanonicalSha256,
    bindingsCanonicalSha256:
      evidenceManifest.artifacts?.bindingsCanonicalSha256,
  };
  if (
    evidenceManifest.releaseId !== descriptor.graph?.release ||
    JSON.stringify(identity.evidence) !== JSON.stringify(expectedEvidence)
  ) {
    throw new Error(
      "Sales consumer descriptor evidence does not bind the packed public release.",
    );
  }
  const bindingsEntryUrl = await import.meta.resolve(
    `${SALES_PACKAGE_NAME}/bindings`,
  );
  const bindingsModule = await import(bindingsEntryUrl, {
    with: { type: "json" },
  });
  const verification = verifier({
    graph: knowledge.salesKnowledgeRelease,
    bindings: bindingsModule.default,
    evidenceManifest,
    ...knowledge.loadPackagedSalesEvidenceBytes(),
  });
  if (!verification.valid) {
    throw new Error(
      `Packed Sales knowledge evidence verification failed: ${JSON.stringify(verification.issues)}`,
    );
  }
  return {
    package: { name: packageManifest.name, version: packageManifest.version },
    verifierExport: SALES_VERIFIER_EXPORT,
    evidenceManifestExport: SALES_EVIDENCE_MANIFEST_EXPORT,
    releaseId: evidenceManifest.releaseId,
    evidence: expectedEvidence,
    verification: { valid: true, issues: verification.issues },
  };
}

const safeGatePath = await assertSafeConsumerFile(
  gatePath,
  "Compatibility gate",
);
const gateZodManifest = await readSafeJson(
  resolve(dirname(safeGatePath), "node_modules/zod/package.json"),
  "Compatibility gate Zod manifest",
);
if (
  gateZodManifest.name !== "zod" ||
  gateZodManifest.version !== GATE_ZOD_VERSION
) {
  throw new Error(
    `Compatibility gate resolved zod ${gateZodManifest.version ?? "unknown"}, expected ${GATE_ZOD_VERSION}`,
  );
}
const descriptor = await readConsumerDescriptor(descriptorPath);
const gate = await import(pathToFileURL(safeGatePath).href);
const result = gate.runConsumerCompatibilityGate(descriptor);
if (!result.compatible) {
  throw new Error(
    `Clean consumer compatibility failed: ${JSON.stringify(result.issues)}`,
  );
}

let engineZodVersion;
let tsFsrsVersion;
for (const importEntry of descriptor.imports) {
  const packageName = importEntry.package;
  const specifier =
    importEntry.export === "."
      ? packageName
      : `${packageName}/${importEntry.export.replace(/^\.\//, "")}`;
  const entryUrl = await import.meta.resolve(specifier);
  const module = await import(entryUrl);
  if (Object.keys(module).length === 0) {
    throw new Error(`${packageName} exposed no public runtime values.`);
  }
  if (packageName === "@reading-advantage/knowledge-space-core") {
    engineZodVersion = (await findResolvedPackageManifest(entryUrl, "zod"))
      .version;
  }
  if (packageName === "@reading-advantage/srs-engine") {
    tsFsrsVersion = (await findResolvedPackageManifest(entryUrl, "ts-fsrs"))
      .version;
  }
}
const salesAttestation = await verifySalesKnowledge(descriptor);
if (salesAttestation == null) {
  throw new Error(
    "Clean consumer did not produce a Sales knowledge attestation.",
  );
}
if (engineZodVersion !== ENGINE_ZOD_VERSION) {
  throw new Error(
    `Engine consumer resolved zod ${engineZodVersion ?? "unknown"}, expected ${ENGINE_ZOD_VERSION}`,
  );
}
if (tsFsrsVersion !== TS_FSRS_VERSION) {
  throw new Error(
    `Engine consumer resolved ts-fsrs ${tsFsrsVersion ?? "unknown"}, expected ${TS_FSRS_VERSION}`,
  );
}
globalThis.process.stdout.write(
  `${JSON.stringify({
    schemaVersion: "sales-runtime-attestation.v1",
    consumer: { name: descriptor.name, version: descriptor.version },
    salesKnowledge: {
      package: salesAttestation.package,
      verifierExport: salesAttestation.verifierExport,
      evidenceManifestExport: salesAttestation.evidenceManifestExport,
      releaseId: salesAttestation.releaseId,
      evidence: salesAttestation.evidence,
    },
    verification: salesAttestation.verification,
    compatibility: result,
    resolvedVersions: {
      gateZod: gateZodManifest.version,
      engineZod: engineZodVersion,
      tsFsrs: tsFsrsVersion,
    },
  })}\n`,
);
