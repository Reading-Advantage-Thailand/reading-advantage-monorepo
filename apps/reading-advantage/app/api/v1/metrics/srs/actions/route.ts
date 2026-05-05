import { NextResponse } from 'next/server';
import { executeQuickActionController, getAvailableQuickActions } from '@/server/controllers/srs-quick-actions-controller';
import { getCurrentUser, type SessionUser } from '@/lib/session';
import { type ExtendedNextRequest } from '@/server/controllers/auth-controller';

const STAFF_ROLES = ["TEACHER", "ADMIN", "SYSTEM"] as const;

export async function POST(req: ExtendedNextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  if (!STAFF_ROLES.includes((user as SessionUser).role as typeof STAFF_ROLES[number])) {
    return NextResponse.json(
      { message: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }
  
  req.session = { user };
  return executeQuickActionController(req);
}

export async function GET(req: ExtendedNextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  if (!STAFF_ROLES.includes((user as SessionUser).role as typeof STAFF_ROLES[number])) {
    return NextResponse.json(
      { message: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }
  
  req.session = { user };
  return getAvailableQuickActions(req);
}
