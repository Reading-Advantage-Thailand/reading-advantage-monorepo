import { handleResetPassword } from "@reading-advantage/api/routes/auth";
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'POST',
    startedAt: Date.now(),
  }, async () => {

    return handleResetPassword(request as unknown as Parameters<typeof handleResetPassword>[0]);

  });
}
