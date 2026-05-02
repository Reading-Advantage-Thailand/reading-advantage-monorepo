import { router } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { usersRouter } from "./routers/users.js";
import { classesRouter } from "./routers/classes.js";
import { studentsRouter } from "./routers/students.js";
import { assignmentsRouter } from "./routers/assignments.js";

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  classes: classesRouter,
  students: studentsRouter,
  assignments: assignmentsRouter,
});

export type AppRouter = typeof appRouter;
