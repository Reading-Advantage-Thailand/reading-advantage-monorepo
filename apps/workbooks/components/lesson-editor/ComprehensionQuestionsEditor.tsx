"use client";

import type { ComprehensionQuestionsEditorProps } from "./types";

/**
 * Edits the comprehension questions of a workbook lesson as a JSON array of
 * numbered multiple-choice questions. The legacy short-answer question and
 * hint fields have no carrier in the normalized draft content contract, so
 * they are intentionally not rendered in this phase.
 *
 * @param props - Current question values plus an onChange callback; see ComprehensionQuestionsEditorProps.
 * @returns The Comprehension Questions section.
 */
export function ComprehensionQuestionsEditor({
  comprehension_questions,
  onChange,
}: ComprehensionQuestionsEditorProps) {
  const handleQuestionsChange = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      onChange(
        "comprehension_questions",
        parsed as { number: number; question: string; options: string[] }[],
      );
    } catch {
      // Invalid JSON is not propagated; the editor keeps its last valid value.
    }
  };

  return (
    <section aria-labelledby="comprehension-questions-heading">
      <h2 id="comprehension-questions-heading">Comprehension Questions</h2>
      <p>
        The legacy short-answer question and hint are not persisted by the
        normalized draft contract in this phase.
      </p>
      <div>
        <label htmlFor="comprehension_questions">Questions</label>
        <textarea
          id="comprehension_questions"
          value={JSON.stringify(comprehension_questions || [])}
          onChange={(event) => handleQuestionsChange(event.target.value)}
          rows={8}
          className="font-mono"
          placeholder='[{"number": 1, "question": "...", "options": ["A", "B", "C"]}]'
        />
        <p>Enter as JSON array</p>
      </div>
    </section>
  );
}
