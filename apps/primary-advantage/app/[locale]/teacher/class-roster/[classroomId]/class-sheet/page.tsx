import { ClassSheet } from "@/components/teacher/class-login/class-sheet";

/**
 * Class sheet print page: name, username, and a new initial password for each student.
 * @param props.params The route params with the class id.
 * @returns The page.
 */
export default async function ClassSheetPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  return <ClassSheet classroomId={classroomId} />;
}
