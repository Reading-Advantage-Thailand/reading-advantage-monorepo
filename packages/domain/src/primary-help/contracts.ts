import { z } from "zod";

/** A page path with ids replaced by `[id]`, as the help panel sends it (spec FR-11). */
const routePattern = z.string().min(1).max(200).regex(/^\/[A-Za-z0-9\-/[\].]*$/);

/** A help video id of the app registry, for example `B4`. The route checks that the id is in the registry. */
export const helpVideoIdSchema = z.string().regex(/^[A-J][0-9]{1,2}$/);

/** One help event: an `open` of the panel or a `play` of a video (track primary_in_app_help_20261023, FR-11). */
export const recordHelpEventInput = z.discriminatedUnion("event", [
  z.object({ event: z.literal("open"), routePattern, matched: z.number().int().min(0).max(100) }),
  z.object({ event: z.literal("play"), routePattern, videoId: helpVideoIdSchema, source: z.enum(["youtube", "file"]) }),
]);
/** The input of `recordHelpEvent`. */
export type RecordHelpEventInput = z.infer<typeof recordHelpEventInput>;

/** Whether a row was written (false for a user with no school). */
export const recordHelpEventOutput = z.object({ recorded: z.boolean() });
/** The output of `recordHelpEvent`. */
export type RecordHelpEventOutput = z.infer<typeof recordHelpEventOutput>;

/** The report filter: all schools, or one school. */
export const helpEventReportInput = z.object({ schoolId: z.string().uuid().optional() });
/** The input of `helpEventReport`. */
export type HelpEventReportInput = z.infer<typeof helpEventReportInput>;

const counts = { last7: z.number().int().min(0), last30: z.number().int().min(0) };
const pageRow = z.object({ routePattern: z.string(), ...counts });

/**
 * The system help report (FR-12): plays per video and role, opens per page, opens with no video,
 * and the schools with events in the last 30 days (for the school filter).
 */
export const helpEventReportOutput = z.object({
  plays: z.array(z.object({ videoId: z.string(), role: z.string(), ...counts })),
  opens: z.array(pageRow),
  unmatched: z.array(pageRow),
  schools: z.array(z.object({ id: z.string(), name: z.string() })),
});
/** The output of `helpEventReport`. */
export type HelpEventReport = z.infer<typeof helpEventReportOutput>;
