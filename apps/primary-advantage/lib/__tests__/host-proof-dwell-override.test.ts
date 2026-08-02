import { describe, expect, it } from "vitest";

import { createHostProofPlaywrightWebServerCommand } from "../../host-proof-test-config";

describe("Primary host-proof adversarial dwell configuration", () => {
  it("boots only the test-owned server with a stricter server dwell", () => {
    expect(createHostProofPlaywrightWebServerCommand(3107)).toContain(
      "HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS=3000",
    );
  });
});
