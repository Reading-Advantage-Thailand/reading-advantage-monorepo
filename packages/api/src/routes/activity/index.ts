import type { ActivityActor } from "@reading-advantage/activity-runtime/server";
import type { ActivityTransportHandlers } from "@reading-advantage/activity-runtime/transport";

/** Activity transport plus the authenticated tutorial-report bridge. */
export type ActivityHttpHandlers = ActivityTransportHandlers & {
  /**
   * Verifies and persists an untrusted local tutorial report.
   * @param actor Authenticated learner.
   * @param input Untrusted local report.
   * @returns Verified persisted evidence.
   */
  reportTutorial(actor: ActivityActor, input: unknown): Promise<unknown>;
  /**
   * Captures a registered learner repository.
   * @param actor Authenticated learner.
   * @param input Capture request.
   * @returns Snapshot-bound credential.
   */
  prepareTutorial(actor: ActivityActor, input: unknown): Promise<unknown>;
  /**
   * Reissues authority for an existing owned snapshot.
   * @param actor Authenticated learner.
   * @param input Existing snapshot binding.
   * @returns Refreshed snapshot-bound credential.
   */
  reissueTutorialCredential(actor: ActivityActor, input: unknown): Promise<unknown>;
};

/** Authenticated input supplied by an HTTP auth adapter before activity routing. */
export type ActivityHttpRequest = {
  actor: ActivityActor;
  operation: "start" | "append" | "get" | "assess-checkpoint" | "assess-tutorial" | "prepare-tutorial" | "reissue-tutorial-credential" | "report-tutorial";
  body: unknown;
};

/**
 * Routes an authenticated HTTP activity request through transport-independent handlers.
 * @param handlers Request-scoped activity handlers.
 * @param request Authenticated actor, operation, and untrusted request body.
 * @returns JSON-serializable activity response.
 */
export async function handleActivityHttpRequest(handlers: ActivityHttpHandlers, request: ActivityHttpRequest): Promise<unknown> {
  switch (request.operation) {
    case "start": return handlers.start(request.actor, request.body);
    case "append": return handlers.append(request.actor, request.body);
    case "get": return handlers.get(request.actor, request.body);
    case "assess-checkpoint": return handlers.assessCheckpoint(request.actor, request.body);
    case "assess-tutorial": return handlers.assessTutorial(request.actor, request.body);
    case "prepare-tutorial": return handlers.prepareTutorial(request.actor, request.body);
    case "reissue-tutorial-credential": return handlers.reissueTutorialCredential(request.actor, request.body);
    case "report-tutorial": return handlers.reportTutorial(request.actor, request.body);
  }
}
