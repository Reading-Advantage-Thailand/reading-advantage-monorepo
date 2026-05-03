import { NextRequest, NextResponse } from 'next/server';
import { getSRSHealthMetrics, refreshSRSHealthViews } from '@/server/controllers/srs-health-controller';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  (req as any).session = { user };
  return getSRSHealthMetrics(req);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  (req as any).session = { user };
  return refreshSRSHealthViews(req);
}
