import { createTemporaryPasswordChangeHandler } from "@reading-advantage/api/routes/auth";

/** Replaces a temporary password from the cutover hand-out list (FR-5); the client then signs in. */
export const POST = createTemporaryPasswordChangeHandler();
