import { describe, expect, it } from "vitest";
import * as root from "../index.js";
import * as core from "../core.js";
import * as authoring from "../authoring.js";
import * as server from "../server.js";
import * as testing from "../testing.js";

describe("activity runtime public surfaces", () => {
  it("cold-imports root, core, authoring, server, and testing entrypoints", () => {
    expect(root.ACTIVITY_SCHEMA_VERSION).toBe("activity.v1");
    expect(core.activitySchema).toBeDefined();
    expect(authoring.validateActivity).toBeTypeOf("function");
    expect(server.ACTIVITY_SERVER_PORT_VERSION).toBe("activity-server.v1");
    expect(testing.createActivityFixture().schemaVersion).toBe("activity.v1");
  });
});
