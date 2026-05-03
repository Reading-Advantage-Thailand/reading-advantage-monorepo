import { NextRequest, NextResponse } from 'next/server';
import { executeQuickActionController, getAvailableQuickActions } from '@/server/controllers/srs-quick-actions-controller';
import { getCurrentUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  (req as any).session = { user };
  return executeQuickActionController(req);
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  (req as any).session = { user };
  return getAvailableQuickActions(req);
}