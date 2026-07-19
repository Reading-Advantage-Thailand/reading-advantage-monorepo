#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Fails closed when an immutable release assertion is false. */
function invariant(condition, message) {
  if (!condition) throw new Error(`Sales continuation rejected: ${message}`);
}

/** Reads an untrusted JSON evidence document. */
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Returns whether a Cloud Run condition reports ready. */
function isReady(value) {
  return value?.status?.conditions?.some(
    (condition) => condition.type === "Ready" && String(condition.status).toLowerCase() === "true",
  );
}

/** Returns one named environment entry from a Cloud Run revision. */
function envEntry(revision, name) {
  return revision?.spec?.containers?.[0]?.env?.find((entry) => entry.name === name);
}

/**
 * Validates exact immutable evidence for the failed original Sales release.
 * @param descriptor One-use continuation descriptor with immutable release facts.
 * @param evidence Untrusted GCP metadata collected immediately before continuation.
 * @param continuationCommit Exact commit archived for the continuation build.
 * @param continuationManifest SHA-256 of the continuation source manifest.
 * @returns Non-secret immutable identifiers suitable for the continuation receipt.
 * @throws When any original or current release fact differs from the descriptor.
 */
export function verifySalesContinuation(descriptor, evidence, continuationCommit, continuationManifest) {
  invariant(descriptor.schemaVersion === 1 && descriptor.oneUse === true, "descriptor must be one-use schema v1");
  invariant(/^[0-9a-f]{40}$/.test(continuationCommit), "continuation commit is not an exact Git SHA");
  invariant(/^[0-9a-f]{64}$/.test(continuationManifest), "continuation source manifest digest is invalid");

  const original = descriptor.originalRelease;
  const rollback = descriptor.rollback;
  const build = evidence.build;
  invariant(build.id === original.buildId, "original build id drift");
  invariant(build.projectId === descriptor.projectId, "original build project drift");
  invariant(build.status === "FAILURE", "original build is not the recorded failed build");

  const expectedIds = [
    "validate-release-inputs", "verify-curriculum-backup", "build-image", "push-image",
    "migrate-db", "doctor-check", "build-curriculum-workspace-deps",
    "seed-production-curriculum", "verify-production-curriculum", "runtime-db-contract",
    "deploy-legacy-rollback", "capture-legacy-rollback",
    "verify-repair-verify-legacy-rollback", "deploy-company-candidate",
    "allow-public-invoker", "capture-company-candidate", "verify-company-candidate",
    "shift-company-traffic", "verify-custom-domain",
  ];
  invariant(JSON.stringify(build.steps?.map((step) => step.id)) === JSON.stringify(expectedIds), "original step order drift");
  build.steps.forEach((step, index) => {
    const expectedStatus = index <= 10 ? "SUCCESS" : index === 11 ? "FAILURE" : "QUEUED";
    invariant(step.status === expectedStatus, `original step ${index} status drift`);
  });
  const substitutions = build.substitutions ?? {};
  const exactSubstitutions = {
    _RELEASE_COMMIT_SHA: original.commitSha,
    _CURRICULUM_BACKUP_ID: original.backupId,
    _CURRICULUM_BACKUP_NOT_BEFORE: original.backupNotBefore,
    _RELEASE_SOURCE_MANIFEST_SHA256: original.sourceManifestSha256,
  };
  for (const [name, value] of Object.entries(exactSubstitutions)) {
    invariant(substitutions[name] === value, `original substitution ${name} drift`);
  }

  const source = build.sourceProvenance?.resolvedStorageSource;
  invariant(source?.bucket === original.source.bucket, "source bucket drift");
  invariant(source?.object === original.source.object, "source object drift");
  invariant(String(source?.generation) === original.source.generation, "source generation drift");
  const sourceUri = `gs://${original.source.bucket}/${original.source.object}#${original.source.generation}`;
  const hashes = build.sourceProvenance?.fileHashes?.[sourceUri]?.fileHash ?? [];
  invariant(hashes.some((hash) => hash.type === "SHA256" && hash.value === original.source.sha256Base64), "source archive hash drift");

  const deployArgs = build.steps[10]?.args?.join("\n") ?? "";
  invariant(deployArgs.includes(`--image=${original.imageTag}`), "rollback deploy image tag drift");
  invariant(deployArgs.includes("SALES_AUTH_MODE=legacy-school"), "rollback deploy mode drift");
  invariant(deployArgs.includes("DATABASE_URL=SALES_LEGACY_DATABASE_URL:latest"), "rollback database secret drift");
  invariant(deployArgs.includes("--tag=legacy-rollback") && deployArgs.includes("--no-traffic"), "rollback tag or traffic drift");

  const backup = evidence.backup;
  invariant(String(backup.id) === original.backupId, "backup id drift");
  invariant(backup.status === "SUCCESSFUL" && backup.type === "ON_DEMAND", "backup completion drift");
  invariant(backup.description === `sales-curriculum-before-${original.commitSha}-not-before-${original.backupNotBefore}`, "backup description drift");
  invariant(Date.parse(backup.endTime) > Date.parse(original.backupNotBefore), "backup does not end after release boundary");
  invariant(backup.endTime === original.backupEndTime, "backup end time drift");

  const artifactDigest = evidence.artifact?.image_summary?.digest ?? evidence.artifact?.imageSummary?.digest;
  invariant(artifactDigest === original.imageDigest, "artifact digest drift");
  invariant(evidence.artifact?.requestedTag === original.imageTag, "artifact tag drift");

  const traffic = evidence.service?.status?.traffic ?? [];
  invariant(traffic.length === 2, "service traffic entry count drift");
  const oldLive = traffic.find((entry) => entry.revisionName === rollback.previousLiveRevision);
  const rollbackTraffic = traffic.find((entry) => entry.revisionName === rollback.revision);
  invariant(oldLive?.percent === 100, "previous live revision is not exactly 100 percent");
  invariant((rollbackTraffic?.percent ?? 0) === 0 && rollbackTraffic?.tag === rollback.tag, "rollback traffic or tag drift");

  const revision = evidence.rollbackRevision;
  invariant(revision?.metadata?.name === rollback.revision && isReady(revision), "rollback revision identity or readiness drift");
  invariant(revision?.spec?.containers?.[0]?.image === `${original.imageTag.slice(0, original.imageTag.lastIndexOf(":"))}@${original.imageDigest}`, "rollback revision digest drift");
  invariant(envEntry(revision, "SALES_AUTH_MODE")?.value === rollback.mode, "rollback auth mode drift");
  invariant(envEntry(revision, "DATABASE_URL")?.valueFrom?.secretKeyRef?.name === rollback.databaseSecret, "rollback database secret binding drift");

  invariant(evidence.iam?.bindings?.some((binding) => binding.role === "roles/run.invoker" && binding.members?.includes("allUsers")), "public invoker IAM drift");
  invariant(evidence.domain?.metadata?.name === descriptor.domain && isReady(evidence.domain), "custom domain readiness drift");

  return {
    originalBuildId: original.buildId,
    originalCommitSha: original.commitSha,
    imageDigest: original.imageDigest,
    backupId: original.backupId,
    continuationCommit,
    continuationManifest,
  };
}

/** Runs the standalone evidence validator. */
function main() {
  const [descriptorPath, evidenceDir, continuationCommit, continuationManifest] = process.argv.slice(2);
  invariant(Boolean(descriptorPath && evidenceDir && continuationCommit && continuationManifest), "usage: descriptor evidence-dir continuation-commit continuation-manifest");
  const descriptor = readJson(descriptorPath);
  const evidence = {
    build: readJson(join(evidenceDir, "build.json")),
    backup: readJson(join(evidenceDir, "backup.json")),
    artifact: readJson(join(evidenceDir, "artifact.json")),
    service: readJson(join(evidenceDir, "service.json")),
    rollbackRevision: readJson(join(evidenceDir, "rollback-revision.json")),
    iam: readJson(join(evidenceDir, "iam.json")),
    domain: readJson(join(evidenceDir, "domain.json")),
  };
  process.stdout.write(`${JSON.stringify({ event: "sales_continuation_original_release_verified", ...verifySalesContinuation(descriptor, evidence, continuationCommit, continuationManifest) })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) {
    process.stderr.write(`${JSON.stringify({ event: "sales_continuation_rejected", error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  }
}
