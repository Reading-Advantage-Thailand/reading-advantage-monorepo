import React from "react";
import EnhancedClassRoster from "@/components/teacher/enhanced-class-roster";
import { getTranslations } from "next-intl/server";

export default async function ClassroomDetailPage() {
  // Keep available for future header usage if needed
  await getTranslations("Teacher.EnhancedClassRoster");
  return (
    <div>
      <EnhancedClassRoster />
    </div>
  );
}
