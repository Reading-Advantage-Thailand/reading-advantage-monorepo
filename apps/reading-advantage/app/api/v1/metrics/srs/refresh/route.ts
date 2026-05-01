import { NextRequest, NextResponse } from 'next/server';
import { refreshSRSHealthViews } from '@/server/controllers/srs-health-controller';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/v1/metrics/srs/refresh
 * 
 * Refresh SRS Health Materialized Views
 * 
 * Admin-only endpoint to refresh the SRS health metrics materialized views.
 * This should be called periodically or when data inconsistencies are detected.
 * 
 * RBAC: Admin/System only
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  // Add session to request
  (req as any).session = session;
  return refreshSRSHealthViews(req);
}