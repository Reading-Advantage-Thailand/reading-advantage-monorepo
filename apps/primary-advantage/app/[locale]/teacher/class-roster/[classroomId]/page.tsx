import EnhancedClassRoster from "@/components/teacher/enhanced-class-roster";

/**
 * Teacher class page: the class heading, the class sign-in card, one student list (live roster
 * with the roster management actions), and the class book slot.
 * @param props.params The route params with the class id.
 * @returns The class page.
 */
export default async function ClassroomDetailPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  return <EnhancedClassRoster classroomId={classroomId} />;
}
