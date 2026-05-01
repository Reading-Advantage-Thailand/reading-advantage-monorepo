import { NextRequest, NextResponse } from 'next/server';
import { getSRSHealthMetrics, refreshSRSHealthViews } from '@/server/controllers/srs-health-controller';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/v1/metrics/srs
 * 
 * Get SRS Health Metrics
 * 
 * Query Parameters:
 * - studentId?: string - Get metrics for specific student
 * - classroomId?: string - Get class-level metrics
 * - schoolId?: string - Get school-level metrics (admin only)
 * - includeDetails?: boolean - Include detailed recommendations
 * 
 * RBAC:
 * - Students: Can only access their own metrics
 * - Teachers: Can access their students and classes
 * - Admins: Can access all levels including school-wide metrics
 * 
 * Response includes:
 * - Health status and overload indicators
 * - Recommendation algorithms 
 * - Quick action suggestions
 * - Threshold configurations
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  // Add session to request
  (req as any).session = session;
  return getSRSHealthMetrics(req);
}

/**
 * POST /api/v1/metrics/srs
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
