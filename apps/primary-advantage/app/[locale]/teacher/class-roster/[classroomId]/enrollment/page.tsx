import { Suspense } from "react";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import EnrollmentClient from "@/components/teacher/enrollment-client";
import { adaptClassroomPayload } from "@/components/teacher/enrollment-classroom";
import { currentUser } from "@/lib/session";
import { isStaffRole } from "@/lib/permissions";
import { getClassroomWithStudents } from "@/server/models/classroomModel";

/**
 * Fetches the classroom on the server and renders the enrollment client.
 * @param classroomId The classroom identifier.
 * @returns The enrollment page with server-fetched initial data.
 */
async function EnrollmentData({ classroomId }: { classroomId: string }) {
  const user = await currentUser();

  if (!user || !isStaffRole(user.role)) {
    return <AuthErrorPage />;
  }

  const payload = await getClassroomWithStudents(classroomId, user);

  return (
    <EnrollmentClient
      classroomId={classroomId}
      initialClassroom={adaptClassroomPayload(payload)}
    />
  );
}

/**
 * Classroom enrollment page. Streams the server-fetched classroom under
 * Suspense so the skeleton covers real data loading.
 * @param params The route parameters.
 * @returns The classroom enrollment page.
 */
export default async function EnrollmentPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;

  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6" aria-busy="true">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      }
    >
      <EnrollmentData classroomId={classroomId} />
    </Suspense>
  );
}
