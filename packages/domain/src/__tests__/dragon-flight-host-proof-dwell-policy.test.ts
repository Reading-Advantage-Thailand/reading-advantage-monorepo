import { describe, expect, it } from "vitest";

import { DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS } from "../games/dragon-flight-host-proof-attempt.js";
import { resolveDragonFlightHostProofGateToLaunchDwellMs } from "../games/dragon-flight-host-proof-attempt-adapter.js";

describe("Dragon Flight host-proof server dwell policy", () => {
  it("defaults to the production dwell and permits only stricter server test overrides", () => {
    expect(resolveDragonFlightHostProofGateToLaunchDwellMs({})).toBe(
      DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS,
    );
    expect(resolveDragonFlightHostProofGateToLaunchDwellMs({
      HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS: "3000",
    })).toBe(3000);
    expect(() => resolveDragonFlightHostProofGateToLaunchDwellMs({
      HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS: "249",
    })).toThrow(/at least/u);
    expect(() => resolveDragonFlightHostProofGateToLaunchDwellMs({
      HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS: "not-a-number",
    })).toThrow(/integer/u);
    expect(() => resolveDragonFlightHostProofGateToLaunchDwellMs({
      NODE_ENV: "production",
      HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS: "3000",
    })).toThrow(/production/u);
  });
});
