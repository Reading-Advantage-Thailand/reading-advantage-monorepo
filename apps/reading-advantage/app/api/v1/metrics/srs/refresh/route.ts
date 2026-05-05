import { NextResponse } from 'next/server';
import { refreshSRSHealthViews } from '@/server/controllers/srs-health-controller';
import { getCurrentUser, type SessionUser } from '@/lib/session';
import { type ExtendedNextRequest } from '@/server/controllers/auth-controller';

const ADMIN_ROLES = ["ADMIN", "SYSTEM"] as const;

export async function POST(req: ExtendedNextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  if (!ADMIN_ROLES.includes((user as SessionUser).role as typeof ADMIN_ROLES[number])) {
    return NextResponse.json(
      { message: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }
  
  req.session = { user };
  return refreshSRSHealthViews(req);
}
