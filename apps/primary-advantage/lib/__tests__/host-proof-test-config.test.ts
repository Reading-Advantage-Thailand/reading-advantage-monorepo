import { describe, expect, it } from "vitest";

import {
  createHostProofPlaywrightWebServerCommand,
  DEFAULT_HOST_PROOF_TEST_CLASS_CODE,
  DEFAULT_HOST_PROOF_TEST_STUDENT_USERNAME,
  getHostProofTestCredentials,
} from "../../host-proof-test-config";

describe("Primary host-proof test configuration", () => {
  it("uses the same default username the host-proof seeder creates", () => {
    expect(getHostProofTestCredentials({})).toEqual({
      classCode: DEFAULT_HOST_PROOF_TEST_CLASS_CODE,
      studentUsername: DEFAULT_HOST_PROOF_TEST_STUDENT_USERNAME,
    });
  });

  it("allows both fixture credentials to be overridden together", () => {
    expect(
      getHostProofTestCredentials({
        HOST_PROOF_TEST_CLASS_CODE: "class-code",
        HOST_PROOF_TEST_STUDENT_USERNAME: "proof-student",
      }),
    ).toEqual({ classCode: "class-code", studentUsername: "proof-student" });
  });

  it("starts Playwright server with the hidden host-proof surface enabled", () => {
    expect(createHostProofPlaywrightWebServerCommand(3001)).toBe(
      "HOST_PROOF_ENABLED=true PORT=3001 npm run dev",
    );
  });
});
