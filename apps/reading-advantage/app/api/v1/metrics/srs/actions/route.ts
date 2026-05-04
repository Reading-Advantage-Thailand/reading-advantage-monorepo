import { NextResponse } from 'next/server';
import { executeQuickActionController, getAvailableQuickActions } from '@/server/controllers/srs-quick-actions-controller';
import { getCurrentUser } from '@/lib/session';
import { type ExtendedNextRequest } from '@/server/controllers/auth-controller';

export async function POST(req: ExtendedNextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
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
  
  req.session = { user };
  return getAvailableQuickActions(req);
}
