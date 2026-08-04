"use client";

import { useState, type ReactNode } from "react";
import type { workbooks } from "@reading-advantage/domain";
import type { WorkbookSession } from "../../lib/session";
import { BasicInfoEditor } from "../../../components/lesson-editor/BasicInfoEditor";
import { ArticleEditor } from "../../../components/lesson-editor/ArticleEditor";
import { ComprehensionQuestionsEditor } from "../../../components/lesson-editor/ComprehensionQuestionsEditor";
import { DraftSettingsDialog } from "../../../components/lesson-editor/DraftSettingsDialog";
import { LessonPreviewModal } from "../../../components/lesson-editor/LessonPreviewModal";
import { LessonReflectionEditor } from "../../../components/lesson-editor/LessonReflectionEditor";
import { LessonStatusBanners } from "../../../components/lesson-editor/LessonStatusBanners";
import { PedagogicalConnectorsEditor } from "../../../components/lesson-editor/PedagogicalConnectorsEditor";
import { VocabularyEditor } from "../../../components/lesson-editor/VocabularyEditor";
import { WritingPromptEditor } from "../../../components/lesson-editor/WritingPromptEditor";
import { previewDraftAction, updateDraftSettingsAction } from "./actions";
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
 * draft server actions with optimistic concurrency. The Preview button renders
 * the draft's persisted normalized content through the preview server action
 * and shows the returned html in the live preview modal; a render failure is
 * surfaced through the status banners and the modal stays closed.
 * @param props The editable draft to edit.
 * @returns The editor sections and status banners.
 */
function DraftLessonEditorView({
  draft,
}: DraftLessonEditorViewProps): ReactNode {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const {
    lesson,
    saving,
    errors,
    saveSuccess,
    revisionConflict,
    revisionConflictMessage,
    settings,
    revision,
    setLessonField,
    setFormError,
    applySettingsSave,
    notifyRevisionConflict,
    validateAndSave,
  } = useDraftLessonEditor({ initialDraft: draft });

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const result = await previewDraftAction(draft.draftId);
      if (result.ok) {
        setPreviewHtml(result.html);
        setPreviewOpen(true);
      } else {
        setFormError(result.message);
      }
    } catch {
      setFormError("An error occurred while rendering the preview.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSaveSettings = async (
    settings: workbooks.WorkbookDraftSettings,
  ) => {
    setSettingsSaving(true);
    try {
      const result = await updateDraftSettingsAction(
        draft.draftId,
        revision,
        settings,
      );
      if (result.ok) {
        applySettingsSave(result.draft);
        setSettingsOpen(false);
      } else if (result.code === "REVISION_CONFLICT") {
        await notifyRevisionConflict(result.message);
        setSettingsOpen(false);
      } else {
        setFormError(result.message);
      }
    } catch {
      setFormError("An error occurred while saving the draft settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <main>
      <h1>{lesson.lesson_title || "Untitled lesson"}</h1>
      <p>Draft {draft.draftId} — revision {revision}</p>

      <div>
        <button type="button" onClick={() => void validateAndSave()} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => void handlePreview()}
          disabled={previewing}
          title="Previews the last saved content"
        >
          {previewing ? "Rendering..." : "Preview"}
        </button>
        <button type="button" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
      </div>

      <LessonStatusBanners
        formError={errors._form}
        saveSuccess={saveSuccess}
        revisionConflict={revisionConflict}
        revisionConflictMessage={revisionConflictMessage}
      />

      <p role="note">
        Deferred in this phase: sentence-order questions and sentence-completion
        prompts (the legacy lesson editor has no UI section for them); AI
        augment and image generation (proposal-only via @reading-advantage/ai,
        FR-11).
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

      <VocabularyEditor
        vocabulary={lesson.vocabulary}
        vocab_match={lesson.vocab_match}
        vocab_fill={lesson.vocab_fill}
        vocab_word_bank={lesson.vocab_word_bank}
        onChange={setLessonField}
      />

      <PedagogicalConnectorsEditor
        connection_question={lesson.connection_question}
        grammar_search_term={lesson.grammar_search_term}
        phonics_focus={lesson.phonics_focus}
        discussion_question={lesson.discussion_question}
        onChange={setLessonField}
      />

      <ComprehensionQuestionsEditor
        comprehension_questions={lesson.comprehension_questions}
        onChange={setLessonField}
      />

      <WritingPromptEditor
        writing_prompt={lesson.writing_prompt}
        writing_plan_prompts={lesson.writing_plan_prompts}
        writing_sentence_frames={lesson.writing_sentence_frames}
        sentence_starters={lesson.sentence_starters}
        onChange={setLessonField}
      />

      <LessonReflectionEditor
        reflection_focus={lesson.reflection_focus}
        onChange={setLessonField}
      />

      {previewOpen && (
        <LessonPreviewModal
          previewHtml={previewHtml}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {settingsOpen && (
        <DraftSettingsDialog
          settings={settings}
          saving={settingsSaving}
          onSave={(next) => void handleSaveSettings(next)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
