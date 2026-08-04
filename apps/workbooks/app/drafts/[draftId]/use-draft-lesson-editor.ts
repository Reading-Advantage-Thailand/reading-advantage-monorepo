"use client";

import { useCallback, useState } from "react";
import type { workbooks } from "@reading-advantage/domain";
import {
  draftLessonSchema,
  lessonToWorkbookContent,
  workbookContentToLesson,
  type DraftLesson,
} from "./lesson-mapping";
import { getDraftAction, updateDraftAction } from "./actions";

/** Inputs required to mount the draft lesson editor. */
export interface UseDraftLessonEditorParams {
  /** Draft selected in the workspace; the editor edits this draft's content. */
  initialDraft: workbooks.WorkbookDraft;
}

/** State and handlers owned by the draft lesson editor. */
export interface UseDraftLessonEditorResult {
  /** Legacy-shaped lesson state currently shown by the editor. */
  lesson: DraftLesson;
  /** Whether the editor is refreshing from the server after a conflict. */
  loading: boolean;
  /** Whether a save is currently in flight. */
  saving: boolean;
  /** Field-keyed validation errors from the editor Zod contract. */
  errors: Record<string, string>;
  /** Whether the last save succeeded. */
  saveSuccess: boolean;
  /** Whether the last save failed with an optimistic-concurrency conflict. */
  revisionConflict: boolean;
  /** Human explanation of an active revision conflict. */
  revisionConflictMessage: string | undefined;
  /** Project settings last persisted for the draft, when present. */
  settings: workbooks.WorkbookDraftSettings | undefined;
  /** Revision the editor last saw; feeds optimistic-concurrency saves. */
  revision: number;
  /** Sets one legacy field of the lesson state. */
  setLessonField: <K extends keyof DraftLesson>(
    field: K,
    value: DraftLesson[K],
  ) => void;
  /** Surfaces a form-level error message through the status banners. */
  setFormError: (message: string) => void;
  /**
   * Records a successful settings save: updates the tracked revision and
   * settings without discarding unsaved lesson edits.
   */
  applySettingsSave: (draft: workbooks.WorkbookDraft) => void;
  /**
   * Surfaces a structured settings-save conflict: flags the revision conflict,
   * records the message, and reloads the latest revision from the server so
   * the tracked revision is no longer stale.
   */
  notifyRevisionConflict: (message: string) => Promise<void>;
  /** Validates the lesson and persists it through the server action. */
  validateAndSave: () => Promise<void>;
  /** Reloads the latest draft revision from the server. */
  refreshFromServer: () => Promise<void>;
}

/**
 * Owns all state and data flow for the draft lesson editor.
 *
 * Loads the initial legacy-shaped lesson from the draft supplied by the server
 * component, and persists edits through the updateDraftAction server action,
 * which applies optimistic concurrency. A REVISION_CONFLICT failure surfaces as
 * structured conflict state and triggers a reload of the latest revision.
 * @param params Draft whose content is being edited; see UseDraftLessonEditorParams.
 * @returns Editor state and the handlers that mutate it; see UseDraftLessonEditorResult.
 */
export function useDraftLessonEditor({
  initialDraft,
}: UseDraftLessonEditorParams): UseDraftLessonEditorResult {
  const [lesson, setLesson] = useState<DraftLesson>(() =>
    workbookContentToLesson(initialDraft.sourceRecord.content),
  );
  const [revision, setRevision] = useState<number>(initialDraft.revision);
  const [settings, setSettings] = useState(
    initialDraft.sourceRecord.settings,
  );
  const [assets, setAssets] = useState<readonly workbooks.WorkbookAssetMetadata[]>(
    initialDraft.sourceRecord.content.assets,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const [revisionConflictMessage, setRevisionConflictMessage] = useState<
    string | undefined
  >(undefined);

  const applyDraft = useCallback((draft: workbooks.WorkbookDraft) => {
    setLesson(workbookContentToLesson(draft.sourceRecord.content));
    setRevision(draft.revision);
    setAssets(draft.sourceRecord.content.assets);
    setSettings(draft.sourceRecord.settings);
  }, []);

  const setLessonField = useCallback(
    <K extends keyof DraftLesson>(field: K, value: DraftLesson[K]) => {
      setLesson((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const setFormError = useCallback((message: string) => {
    setErrors({ _form: message });
  }, []);

  const applySettingsSave = useCallback(
    (draft: workbooks.WorkbookDraft) => {
      setSettings(draft.sourceRecord.settings);
      setRevision(draft.revision);
    },
    [],
  );

  const refreshFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDraftAction(initialDraft.draftId);
      if (result.ok && result.draft !== null) {
        applyDraft(result.draft);
      }
    } finally {
      setLoading(false);
    }
  }, [initialDraft.draftId, applyDraft]);

  const notifyRevisionConflict = useCallback(
    async (message: string) => {
      setRevisionConflict(true);
      setRevisionConflictMessage(message);
      await refreshFromServer();
    },
    [refreshFromServer],
  );

  const validateAndSave = useCallback(async () => {
    setErrors({});
    setSaveSuccess(false);
    setRevisionConflict(false);
    setRevisionConflictMessage(undefined);

    const validationResult = draftLessonSchema.safeParse(lesson);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const path = issue.path.join(".");
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const content = lessonToWorkbookContent(validationResult.data, assets);
      const result = await updateDraftAction(
        initialDraft.draftId,
        revision,
        content,
      );
      if (result.ok) {
        applyDraft(result.draft);
        setSaveSuccess(true);
      } else if (result.code === "REVISION_CONFLICT") {
        setRevisionConflict(true);
        setRevisionConflictMessage(result.message);
        await refreshFromServer();
      } else {
        setErrors({ _form: result.message });
      }
    } catch {
      setErrors({ _form: "An error occurred while saving the draft." });
    } finally {
      setSaving(false);
    }
  }, [lesson, assets, revision, initialDraft.draftId, applyDraft, refreshFromServer]);

  return {
    lesson,
    loading,
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
    refreshFromServer,
  };
}
