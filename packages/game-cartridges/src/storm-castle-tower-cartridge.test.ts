import { describe, expect, it } from "vitest";

import { createStormCastleTowerMechanic, StormCastleTowerEvidenceUnavailableError } from "./storm-castle-tower-cartridge.js";

describe("Storm the Castle Tower cartridge", () => {
  it("retains current absence and historical behavior as a fail-closed QC boundary", () => {
    const mechanic = createStormCastleTowerMechanic();

    expect(mechanic.snapshot()).toMatchObject({ status: "blocked", completionSupported: false, blockingClaim: { claimId: "SCT-ABS-001" }, historicalClaim: { claimId: "SCT-MECH-H005" } });
    expect(() => mechanic.selectWindow(0)).toThrow(StormCastleTowerEvidenceUnavailableError);
    expect(() => mechanic.hitHazard()).toThrow(StormCastleTowerEvidenceUnavailableError);
    expect(() => mechanic.reachSummit()).toThrow(StormCastleTowerEvidenceUnavailableError);
  });
});
