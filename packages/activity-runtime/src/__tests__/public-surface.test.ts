import { describe, expect, it } from "vitest";
import * as root from "@reading-advantage/activity-runtime";
import * as core from "@reading-advantage/activity-runtime/core";
import * as authoring from "@reading-advantage/activity-runtime/authoring";
import * as server from "@reading-advantage/activity-runtime/server";
import * as testing from "@reading-advantage/activity-runtime/testing";

describe("activity runtime public surfaces", () => {
  it("cold-imports root, core, authoring, server, and testing entrypoints", () => {
    expect(root.ACTIVITY_SCHEMA_VERSION).toBe("activity.v1");
    expect(core.activitySchema).toBeDefined();
    expect(authoring.validateActivity).toBeTypeOf("function");
    expect(server.ACTIVITY_SERVER_PORT_VERSION).toBe("activity-server.v1");
    expect(testing.createActivityFixture().schemaVersion).toBe("activity.v1");
  });
});
