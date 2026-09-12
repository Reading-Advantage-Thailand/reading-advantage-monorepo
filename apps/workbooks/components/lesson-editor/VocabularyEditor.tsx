"use client";

import type {
  VocabularyEditorProps,
  VocabularyFillItem,
  VocabularyItem,
  VocabularyMatchItem,
} from "./types";
import { useJsonField } from "./use-json-field";

/**
 * Edits the vocabulary section of a workbook lesson as JSON arrays: the
 * vocabulary items, the matching-activity items, the fill-in-the-blank items,
 * and the word bank. Each array mirrors the legacy lesson schema field of the
 * same name and persists through its normalized contract carrier.
 *
 * Each JSON field keeps its raw text in local state so intermediate invalid
 * fragments remain typeable; only successful parses propagate upward, and
 * invalid input surfaces an inline parse error.
 * @param props - Current vocabulary values plus an onChange callback; see VocabularyEditorProps.
 * @returns The Vocabulary section.
 */
export function VocabularyEditor({
  vocabulary,
  vocab_match,
  vocab_fill,
  vocab_word_bank,
  onChange,
}: VocabularyEditorProps) {
  const vocabularyField = useJsonField(
    vocabulary,
    (value) => JSON.stringify(value ?? [], null, 2),
    (parsed) => onChange("vocabulary", parsed as VocabularyItem[]),
  );
  const matchField = useJsonField(
    vocab_match,
    (value) => JSON.stringify(value ?? [], null, 2),
    (parsed) => onChange("vocab_match", parsed as VocabularyMatchItem[]),
  );
  const fillField = useJsonField(
    vocab_fill,
    (value) => JSON.stringify(value ?? [], null, 2),
    (parsed) => onChange("vocab_fill", parsed as VocabularyFillItem[]),
  );
  const wordBankField = useJsonField(
    vocab_word_bank,
    (value) => JSON.stringify(value ?? [], null, 2),
    (parsed) => onChange("vocab_word_bank", parsed as string[]),
  );

  const itemCount = vocabulary?.length || 0;

  return (
    <section aria-labelledby="vocabulary-heading">
      <h2 id="vocabulary-heading">Vocabulary</h2>
      <div>
        <label htmlFor="vocabulary">Vocabulary Items</label>
        <textarea
          id="vocabulary"
          value={vocabularyField.value}
          onChange={(event) => vocabularyField.handleChange(event.target.value)}
          rows={8}
          className="font-mono"
          placeholder='[{"word": "example", "definition": "..."}]'
          aria-describedby="vocabulary-hint"
        />
        {vocabularyField.error && (
          <p id="vocabulary-error" role="alert">
            {vocabularyField.error}
          </p>
        )}
        <p id="vocabulary-hint">
          Enter as JSON array{" "}
          {itemCount > 0 && `(${itemCount} items)`}
        </p>
      </div>
      <div>
        <label htmlFor="vocab_match">Matching Items</label>
        <textarea
          id="vocab_match"
          value={matchField.value}
          onChange={(event) => matchField.handleChange(event.target.value)}
          rows={6}
          className="font-mono"
          placeholder='[{"number": 1, "word": "example", "letter": "A", "definition": "..."}]'
          aria-describedby="vocab_match-hint"
        />
        {matchField.error && (
          <p id="vocab_match-error" role="alert">
            {matchField.error}
          </p>
        )}
        <p id="vocab_match-hint">Enter as JSON array of matching items</p>
      </div>
      <div>
        <label htmlFor="vocab_fill">Fill Items</label>
        <textarea
          id="vocab_fill"
          value={fillField.value}
          onChange={(event) => fillField.handleChange(event.target.value)}
          rows={6}
          className="font-mono"
          placeholder='[{"number": 1, "sentence": "The ___ shows the library."}]'
          aria-describedby="vocab_fill-hint"
        />
        {fillField.error && (
          <p id="vocab_fill-error" role="alert">
            {fillField.error}
          </p>
        )}
        <p id="vocab_fill-hint">
          Enter as JSON array of fill-in-the-blank items
        </p>
      </div>
      <div>
        <label htmlFor="vocab_word_bank">Word Bank</label>
        <textarea
          id="vocab_word_bank"
          value={wordBankField.value}
          onChange={(event) => wordBankField.handleChange(event.target.value)}
          rows={4}
          className="font-mono"
          placeholder='["map", "library"]'
          aria-describedby="vocab_word_bank-hint"
        />
        {wordBankField.error && (
          <p id="vocab_word_bank-error" role="alert">
            {wordBankField.error}
          </p>
        )}
        <p id="vocab_word_bank-hint">Enter as JSON array of words</p>
      </div>
    </section>
  );
}
