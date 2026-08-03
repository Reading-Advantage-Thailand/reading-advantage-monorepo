"use client";

import type { BasicInfoEditorProps } from "./types";

/**
 * Edits the basic information of a workbook lesson: the lesson title and CEFR
 * level. The legacy lesson_number, level_name, and genre fields have no
 * carrier in the normalized draft content contract, so they are intentionally
 * not rendered in this phase.
 *
 * @param props - Current values plus an onChange callback; see BasicInfoEditorProps.
 * @returns The Basic Information section.
 */
export function BasicInfoEditor({
  lesson_title,
  cefr_level,
  onChange,
}: BasicInfoEditorProps) {
  return (
    <section aria-labelledby="basic-info-heading">
      <h2 id="basic-info-heading">Basic Information</h2>
      <p>
        Lesson number, level name, and genre are not persisted by the
        normalized draft contract in this phase.
      </p>
      <div>
        <label htmlFor="lesson_title">Lesson Title</label>
        <input
          id="lesson_title"
          value={lesson_title || ""}
          onChange={(event) => onChange("lesson_title", event.target.value)}
          placeholder="e.g., The Library Map"
        />
      </div>
      <div>
        <label htmlFor="cefr_level">CEFR Level</label>
        <input
          id="cefr_level"
          value={cefr_level || ""}
          onChange={(event) => onChange("cefr_level", event.target.value)}
          placeholder="e.g., A1"
        />
      </div>
    </section>
  );
}
