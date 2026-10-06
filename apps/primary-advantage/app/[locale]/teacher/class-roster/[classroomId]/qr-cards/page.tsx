import { QrCardSheet } from "@/components/teacher/class-login/qr-card-sheet";

/**
 * QR login card print page: 8 cards per A4 page.
 * @param props.params The route params with the class id.
 * @returns The page.
 */
export default async function QrCardsPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  return <QrCardSheet classroomId={classroomId} />;
}
