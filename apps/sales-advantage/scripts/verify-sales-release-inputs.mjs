import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const RFC3339_UTC =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/;
const ONE_HOUR_NANOSECONDS = 3_600_000_000_000n;

/**
 * Parses an exact UTC RFC3339 timestamp without losing fractional precision.
 * @param value UTC RFC3339 value with at most nanosecond precision.
 * @param label Stable error prefix for the input boundary.
 * @returns Nanoseconds since the Unix epoch.
 * @throws When the value is not an exact, possible UTC RFC3339 timestamp.
 */
export function parseRfc3339Nanoseconds(value, label) {
  const match = RFC3339_UTC.exec(value);
  if (!match) throw new Error(`${label}_INVALID`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText,
    fractionText = ""] = match;
  const [year, month, day, hour, minute, second] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
  ].map(Number);
  const milliseconds = Date.UTC(year, month - 1, day, hour, minute, second);
  const parsed = new Date(milliseconds);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute ||
    parsed.getUTCSeconds() !== second
  ) {
    throw new Error(`${label}_INVALID`);
  }
  const fractionNanoseconds = BigInt(fractionText.padEnd(9, "0") || "0");
  return BigInt(milliseconds) * 1_000_000n + fractionNanoseconds;
}

/**
 * Validates commit identity and the non-reusable release freshness boundary.
 * @param commit Exact lowercase release commit.
 * @param backupNotBefore Fresh backup boundary for this release attempt.
 * @param validationNow Current UTC time captured by the release gate.
 * @returns Parsed boundary and current time in nanoseconds.
 * @throws When the identity or freshness contract is not satisfied.
 */
export function validateReleaseInputs(commit, backupNotBefore, validationNow) {
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error("SALES_RELEASE_COMMIT_INVALID");
  }
  const boundary = parseRfc3339Nanoseconds(
    backupNotBefore,
    "SALES_RELEASE_BACKUP_NOT_BEFORE",
  );
  const now = parseRfc3339Nanoseconds(
    validationNow,
    "SALES_RELEASE_VALIDATION_NOW",
  );
  const age = now - boundary;
  if (age < 0n || age > ONE_HOUR_NANOSECONDS) {
    throw new Error("SALES_RELEASE_BACKUP_BOUNDARY_STALE");
  }
  return { boundary, now };
}

/**
 * Validates exact Cloud SQL backup metadata against one release attempt.
 * @param metadata Backup Run metadata returned by Cloud SQL Admin.
 * @param commit Exact lowercase release commit.
 * @param backupNotBefore Fresh backup boundary for this release attempt.
 * @param validationNow Current UTC time captured by the release gate.
 * @returns True after every backup contract is satisfied.
 * @throws When the backup does not belong to this fresh release attempt.
 */
export function validateCurriculumBackup(
  metadata,
  commit,
  backupNotBefore,
  validationNow,
) {
  const { boundary } = validateReleaseInputs(
    commit,
    backupNotBefore,
    validationNow,
  );
  if (metadata.status !== "SUCCESSFUL") {
    throw new Error("SALES_RELEASE_BACKUP_STATUS_INVALID");
  }
  if (metadata.type !== "ON_DEMAND") {
    throw new Error("SALES_RELEASE_BACKUP_TYPE_INVALID");
  }
  const expectedDescription =
    `sales-curriculum-before-${commit}-not-before-${backupNotBefore}`;
  if (metadata.description !== expectedDescription) {
    throw new Error("SALES_RELEASE_BACKUP_DESCRIPTION_MISMATCH");
  }
  const endTime = parseRfc3339Nanoseconds(
    metadata.endTime,
    "SALES_RELEASE_BACKUP_END_TIME",
  );
  if (endTime <= boundary) {
    throw new Error("SALES_RELEASE_BACKUP_NOT_FRESH");
  }
  return true;
}

/** Fetches JSON and fails closed on any non-success HTTP status. */
async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`SALES_RELEASE_HTTP_ERROR status=${response.status}`);
  }
  return response.json();
}

/** Reads one Cloud SQL backup using the Cloud Build workload identity token. */
async function readLiveBackup(projectId, instanceId, backupId) {
  const token = await fetchJson(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } },
  );
  if (typeof token.access_token !== "string" || token.access_token.length === 0) {
    throw new Error("SALES_RELEASE_ACCESS_TOKEN_MISSING");
  }
  const path = [
    "https://sqladmin.googleapis.com/sql/v1beta4/projects",
    encodeURIComponent(projectId),
    "instances",
    encodeURIComponent(instanceId),
    "backupRuns",
    encodeURIComponent(backupId),
  ].join("/");
  return fetchJson(path, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
}

async function main() {
  const [command, commit, backupNotBefore, validationNow, ...rest] =
    process.argv.slice(2);
  if (command === "inputs") {
    validateReleaseInputs(commit, backupNotBefore, validationNow);
    return;
  }
  if (command === "backup-file") {
    const [metadataPath] = rest;
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    validateCurriculumBackup(
      metadata,
      commit,
      backupNotBefore,
      validationNow,
    );
    return;
  }
  if (command === "backup-live") {
    const [projectId, instanceId, backupId] = rest;
    if (!projectId || !instanceId || !backupId ||
        backupId === "REQUIRED_CURRICULUM_BACKUP_ID") {
      throw new Error("SALES_RELEASE_BACKUP_ID_INVALID");
    }
    const metadata = await readLiveBackup(projectId, instanceId, backupId);
    validateCurriculumBackup(
      metadata,
      commit,
      backupNotBefore,
      validationNow,
    );
    return;
  }
  throw new Error("SALES_RELEASE_INPUT_COMMAND_INVALID");
}

if (process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
