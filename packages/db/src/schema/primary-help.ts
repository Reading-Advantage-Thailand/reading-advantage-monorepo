/**
 * Help panel events for Primary Advantage (track primary_in_app_help_20261023, spec FR-11).
 * One row is one `open` of the help panel or one `play` of a help video. The row has no user id:
 * the system report needs counts per video, page, role, and school only.
 */
import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { roleEnum, schools } from "./users.js";

export const primaryHelpEvents = pgTable(
  "primary_help_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    /** `open` or `play`. */
    event: text("event").notNull(),
    /** The registry id (for example `B4`) of a played video; null for an open. */
    videoId: text("video_id"),
    /** The page path with ids replaced by `[id]`, for example `/teacher/class-roster/[id]`. */
    routePattern: text("route_pattern").notNull(),
    /** `youtube` or `file` for a play; null for an open. */
    source: text("source"),
    /** The number of videos for the page when the panel opened; null for a play. */
    matched: integer("matched"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("primary_help_events_created_idx").on(t.createdAt),
    index("primary_help_events_school_created_idx").on(t.schoolId, t.createdAt),
  ],
);
