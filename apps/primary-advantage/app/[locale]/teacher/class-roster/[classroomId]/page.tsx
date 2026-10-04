import React from "react";
import EnhancedClassRoster from "@/components/teacher/enhanced-class-roster";
import { ClassLoginPanel } from "@/components/teacher/class-login/class-login-panel";
import { getTranslations } from "next-intl/server";

export default async function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  // Keep available for future header usage if needed
  await getTranslations("Teacher.EnhancedClassRoster");
  return (
    <div className="space-y-6">
      <ClassLoginPanel classroomId={classroomId} />
      <EnhancedClassRoster />
    </div>
  );
}
