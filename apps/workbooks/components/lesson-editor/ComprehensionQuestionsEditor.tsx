"use client";

import type { ComprehensionQuestionsEditorProps } from "./types";
import { useJsonField } from "./use-json-field";

/**
 * Edits the comprehension questions of a workbook lesson as a JSON array of
 * numbered multiple-choice questions. The legacy short-answer question and
 * hint fields have no carrier in the normalized draft content contract, so
 * they are intentionally not rendered in this phase.
 *
 * The JSON field keeps its raw text in local state so intermediate invalid
 * fragments remain typeable; only successful parses propagate upward, and
 * invalid input surfaces an inline parse error.
 * @param props - Current question values plus an onChange callback; see ComprehensionQuestionsEditorProps.
 * @returns The Comprehension Questions section.
 */
export function ComprehensionQuestionsEditor({
  comprehension_questions,
  onChange,
}: ComprehensionQuestionsEditorProps) {
  const questionsField = useJsonField(
    comprehension_questions,
    (value) => JSON.stringify(value ?? []),
    (parsed) =>
      onChange(
        "comprehension_questions",
        parsed as { number: number; question: string; options: string[] }[],
      ),
  );

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
          value={questionsField.value}
          onChange={(event) => questionsField.handleChange(event.target.value)}
          rows={8}
          className="font-mono"
          placeholder='[{"number": 1, "question": "...", "options": ["A", "B", "C"]}]'
          aria-describedby="comprehension_questions-hint"
        />
        {questionsField.error && (
          <p id="comprehension_questions-error" role="alert">
            {questionsField.error}
          </p>
        )}
        <p id="comprehension_questions-hint">Enter as JSON array</p>
      </div>
    </section>
  );
}
