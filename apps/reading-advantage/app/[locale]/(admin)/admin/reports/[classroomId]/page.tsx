import AdminClassroomReport from "@/components/admin/classroom-report";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { log } from "console";

export default async function AdminClassroomReportPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  if (user?.role !== Role.SYSTEM && user?.role !== Role.ADMIN) {
    return redirect("/");
  }

  const getClassroomData = async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const requestHeaders = await headers();
      const res = await fetch(
        `${baseUrl}/api/v1/classroom/${classroomId}`,
        {
          method: "GET",
          headers: requestHeaders,
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(
          `Failed to fetch classroom data: ${res.status} ${res.statusText}`
        );
      }

      const fetchdata = await res.json();

      return {
        classroom: fetchdata.classroom,
        students: fetchdata.studentInClass || [],
      };
    } catch (error) {
      console.error("Error fetching classroom:", error);
      return null;
    }
  };

  const data = await getClassroomData();

  if (!data || !data.classroom) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Classroom Not Found
          </h2>
          <p className="text-gray-600 mt-2">
            The requested classroom could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminClassroomReport
        classroom={data.classroom}
        students={data.students}
        classroomId={classroomId}
      />
    </div>
  );
}
