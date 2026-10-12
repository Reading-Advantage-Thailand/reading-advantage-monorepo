"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { StudentViewMode } from "@/lib/student-view";

const StudentViewContext = createContext<{ mode: StudentViewMode }>({ mode: "student" });

/**
 * Gives the student view mode (set by the server layout) to the client components below.
 * @param props.mode The mode derived from the session role.
 * @param props.children The student pages.
 * @returns The provider.
 */
export function StudentViewProvider({ mode, children }: { mode: StudentViewMode; children: ReactNode }) {
  return <StudentViewContext.Provider value={{ mode }}>{children}</StudentViewContext.Provider>;
}

/**
 * Reads the student view mode. A component that writes must skip its write path in preview.
 * @returns The mode; "student" when no provider wraps the component.
 */
export function useStudentView(): { mode: StudentViewMode } {
  return useContext(StudentViewContext);
}

/**
 * Gives a writing component the preview flag and the "Preview: not saved" notice. In preview the
 * component skips its write path and calls `notSaved` instead.
 * @returns `isPreview`, the `notSaved` toast, and the note text.
 */
export function usePreviewSave(): { isPreview: boolean; notSaved: () => void; noteText: string } {
  const { mode } = useStudentView();
  const t = useTranslations("StudentView");
  const noteText = t("notSaved");
  return { isPreview: mode === "preview", notSaved: () => void toast.info(noteText), noteText };
}
