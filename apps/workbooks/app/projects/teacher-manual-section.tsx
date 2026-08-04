"use client";

import { useState, type ReactNode } from "react";
import type { workbooks } from "@reading-advantage/domain";
import { TeacherManualModal } from "./teacher-manual-modal";

/** Props controlling the teacher manual selection island. */
export interface TeacherManualSectionProps {
  /** Tenant-scoped drafts offered for manual selection. */
  drafts: readonly workbooks.WorkbookDraft[];
}

/**
 * Client island embedded in the drafts list: offers a checkbox per draft and
 * a Teacher Manual action that compiles the selected drafts into one manual.
 *
 * Selection lives only in the browser; the drafts themselves are supplied by
 * the presentational parent. The island is keyboard operable through native
 * checkbox labels inside a fieldset.
 * @param props Tenant-scoped drafts to select from; see TeacherManualSectionProps.
 * @returns The teacher manual picker and, when open, the compile modal.
 */
export function TeacherManualSection({
  drafts,
}: TeacherManualSectionProps): ReactNode {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [modalOpen, setModalOpen] = useState(false);

  const toggleDraft = (draftId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(draftId)) {
        next.delete(draftId);
      } else {
        next.add(draftId);
      }
      return next;
    });
  };

  const selectedDrafts = drafts.filter((draft) => selectedIds.has(draft.draftId));

  return (
    <section aria-label="Teacher manual">
      <fieldset>
        <legend>Teacher Manual</legend>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.5rem 0" }}>
          {drafts.map((draft) => (
            <li key={draft.draftId}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedIds.has(draft.draftId)}
                  onChange={() => toggleDraft(draft.draftId)}
                />
                {draft.sourceRecord.content.title} ({draft.draftId})
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={selectedIds.size === 0}
          onClick={() => setModalOpen(true)}
        >
          Teacher Manual ({selectedIds.size} selected)
        </button>
      </fieldset>
      {modalOpen && (
        <TeacherManualModal
          draftIds={selectedDrafts.map((draft) => draft.draftId)}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}
