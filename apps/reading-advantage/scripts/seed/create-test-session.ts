import { db } from "@reading-advantage/db";
import { createSession } from "@reading-advantage/auth";

(async () => {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: tsx create-test-session.ts <userId>");
    process.exit(1);
  }

  const result = await createSession(db, userId, {
    ipAddress: "127.0.0.1",
    userAgent: "playwright-test",
  });

  console.log(result.token);
  process.exit(0);
})();
