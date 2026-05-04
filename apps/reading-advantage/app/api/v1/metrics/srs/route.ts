import { NextResponse } from 'next/server';
import { getSRSHealthMetrics, refreshSRSHealthViews } from '@/server/controllers/srs-health-controller';
import { getCurrentUser } from '@/lib/session';
import { type ExtendedNextRequest } from '@/server/controllers/auth-controller';

export async function GET(req: ExtendedNextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  req.session = { user };
  return getSRSHealthMetrics(req);
}

export async function POST(req: ExtendedNextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  req.session = { user };
  return refreshSRSHealthViews(req);
}
