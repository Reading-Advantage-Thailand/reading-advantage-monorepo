"use client";

import type { ReactNode } from "react";
import type { workbooks } from "@reading-advantage/domain";
import type { WorkbookSession } from "../../lib/session";
import { BasicInfoEditor } from "../../../components/lesson-editor/BasicInfoEditor";
import { ArticleEditor } from "../../../components/lesson-editor/ArticleEditor";
import { ComprehensionQuestionsEditor } from "../../../components/lesson-editor/ComprehensionQuestionsEditor";
import { LessonStatusBanners } from "../../../components/lesson-editor/LessonStatusBanners";
import { useDraftLessonEditor } from "./use-draft-lesson-editor";

/** Props controlling the draft lesson editor view. */
export interface DraftEditorViewProps {
  /** Verified session projection, or null when no session is present. */
  session: WorkbookSession | null;
  /** Tenant-scoped draft being edited, or null when it does not exist. */
  draft: workbooks.WorkbookDraft | null;
}

/**
 * Renders the draft lesson editor workspace: sign-in gate, authorization gate,
 * missing-draft and read-only states, then the per-section editor over the
 * draft's normalized content.
 *
 * The component is presentational with respect to authorization: the session
 * and draft are supplied by the server component and no business logic or
 * filesystem access happens here.
 * @param props Session projection and the draft to edit.
 * @returns The draft editor workspace view.
 */
export function DraftEditorView({
  session,
  draft,
}: DraftEditorViewProps): ReactNode {
  if (session === null) {
    return (
      <main>
        <h1>Draft Editor</h1>
        <p>Sign-in is required to edit drafts.</p>
      </main>
    );
  }

  if (session.role !== "WORKBOOK_ADMIN") {
    return (
      <main>
        <h1>Draft Editor</h1>
        <p>Access denied. Workbook access requires the WORKBOOK_ADMIN role.</p>
      </main>
    );
  }

  if (draft === null) {
    return (
      <main>
        <h1>Draft Editor</h1>
        <p>Draft not found.</p>
      </main>
    );
  }

  if (draft.status !== "draft") {
    return (
      <main>
        <h1>Draft Editor</h1>
        <p>
          This draft is {draft.status} and cannot be edited. Editing a released
          edition requires a new draft revision.
        </p>
      </main>
    );
  }

  return <DraftLessonEditorView draft={draft} />;
}

/** Props for the interactive lesson editor over an editable draft. */
interface DraftLessonEditorViewProps {
  /** Editable draft whose content is being edited. */
  draft: workbooks.WorkbookDraft;
}

/**
 * Renders the interactive per-section lesson editor for one editable draft.
 * State lives in the useDraftLessonEditor hook, which persists through the
 * draft server actions with optimistic concurrency.
 * @param props The editable draft to edit.
 * @returns The editor sections and status banners.
 */
function DraftLessonEditorView({
  draft,
}: DraftLessonEditorViewProps): ReactNode {
  const {
    lesson,
    saving,
    errors,
    saveSuccess,
    revisionConflict,
    revisionConflictMessage,
    setLessonField,
    validateAndSave,
  } = useDraftLessonEditor({ initialDraft: draft });

  return (
    <main>
      <h1>{lesson.lesson_title || "Untitled lesson"}</h1>
      <p>Draft {draft.draftId} — revision {draft.revision}</p>

      <div>
        <button type="button" onClick={() => void validateAndSave()} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button type="button" disabled title="Live preview arrives in S4c">
          Preview
        </button>
      </div>

      <LessonStatusBanners
        formError={errors._form}
        saveSuccess={saveSuccess}
        revisionConflict={revisionConflict}
        revisionConflictMessage={revisionConflictMessage}
      />

      <p role="note">
        Deferred in this phase: Vocabulary, Pedagogical Connectors, Writing
        Prompt, and Lesson Reflection editors (their fields have no carrier in
        the normalized draft contract yet); AI augment and image generation
        (proposal-only via @reading-advantage/ai, FR-11); and live preview
        (S4c).
      </p>

      <BasicInfoEditor
        lesson_title={lesson.lesson_title}
        cefr_level={lesson.cefr_level}
        onChange={setLessonField}
      />

      <ArticleEditor
        article_paragraphs={lesson.article_paragraphs}
        onChange={setLessonField}
      />

      <ComprehensionQuestionsEditor
        comprehension_questions={lesson.comprehension_questions}
        onChange={setLessonField}
      />
    </main>
  );
}
