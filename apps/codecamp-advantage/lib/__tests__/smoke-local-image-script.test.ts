import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, "../..");
const SCRIPT = resolve(APP_ROOT, "scripts/smoke-local-image.sh");

describe("local image smoke script contract", () => {
  it("exists as the opt-in Phase 2 integration gate", () => {
    expect(existsSync(SCRIPT), `smoke-local-image.sh not found at ${SCRIPT}`).toBe(true);
  });

  it("is gated behind CODECAMP_LOCAL_IMAGE_SMOKE=1", () => {
    const text = readFileSync(SCRIPT, "utf8");
    expect(text).toContain("CODECAMP_LOCAL_IMAGE_SMOKE");
    expect(text).toContain('!= "1"');
    expect(text).toContain("exit 0");
  });

  it("builds the codecamp Dockerfile and runs the image on the app port", () => {
    const text = readFileSync(SCRIPT, "utf8");
    expect(text).toContain("docker build");
    expect(text).toContain("apps/codecamp-advantage/Dockerfile");
    expect(text).toContain("docker run -d");
    expect(text).toContain(":8080");
  });

  it("probes /en/ with curl and bounds the full smoke by timeout", () => {
    const text = readFileSync(SCRIPT, "utf8");
    expect(text).toContain("/en/");
    expect(text).toContain("curl --fail");
    expect(text).toContain("CODECAMP_LOCAL_IMAGE_TIMEOUT:-90");
    expect(text).toContain("exec timeout");
    expect(text).toContain("exit 1");
  });
});
