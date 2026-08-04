"use client";

import type {
  VocabularyEditorProps,
  VocabularyFillItem,
  VocabularyItem,
  VocabularyMatchItem,
} from "./types";

/**
 * Edits the vocabulary section of a workbook lesson as JSON arrays: the
 * vocabulary items, the matching-activity items, the fill-in-the-blank items,
 * and the word bank. Each array mirrors the legacy lesson schema field of the
 * same name and persists through its normalized contract carrier.
 *
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
  const handleVocabularyChange = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      onChange("vocabulary", parsed as VocabularyItem[]);
    } catch {
      // Invalid JSON is not propagated; the editor keeps its last valid value.
    }
  };

  const handleMatchChange = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      onChange("vocab_match", parsed as VocabularyMatchItem[]);
    } catch {
      // Invalid JSON is not propagated; the editor keeps its last valid value.
    }
  };

  const handleFillChange = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      onChange("vocab_fill", parsed as VocabularyFillItem[]);
    } catch {
      // Invalid JSON is not propagated; the editor keeps its last valid value.
    }
  };

  const handleWordBankChange = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      onChange("vocab_word_bank", parsed as string[]);
    } catch {
      // Invalid JSON is not propagated; the editor keeps its last valid value.
    }
  };

  const itemCount = vocabulary?.length || 0;

  return (
    <section aria-labelledby="vocabulary-heading">
      <h2 id="vocabulary-heading">Vocabulary</h2>
      <div>
        <label htmlFor="vocabulary">Vocabulary Items</label>
        <textarea
          id="vocabulary"
          value={JSON.stringify(vocabulary || [], null, 2)}
          onChange={(event) => handleVocabularyChange(event.target.value)}
          rows={8}
          className="font-mono"
          placeholder='[{"word": "example", "definition": "..."}]'
        />
        <p>
          Enter as JSON array{" "}
          {itemCount > 0 && `(${itemCount} items)`}
        </p>
      </div>
      <div>
        <label htmlFor="vocab_match">Matching Items</label>
        <textarea
          id="vocab_match"
          value={JSON.stringify(vocab_match || [], null, 2)}
          onChange={(event) => handleMatchChange(event.target.value)}
          rows={6}
          className="font-mono"
          placeholder='[{"number": 1, "word": "example", "letter": "A", "definition": "..."}]'
        />
        <p>Enter as JSON array of matching items</p>
      </div>
      <div>
        <label htmlFor="vocab_fill">Fill Items</label>
        <textarea
          id="vocab_fill"
          value={JSON.stringify(vocab_fill || [], null, 2)}
          onChange={(event) => handleFillChange(event.target.value)}
          rows={6}
          className="font-mono"
          placeholder='[{"number": 1, "sentence": "The ___ shows the library."}]'
        />
        <p>Enter as JSON array of fill-in-the-blank items</p>
      </div>
      <div>
        <label htmlFor="vocab_word_bank">Word Bank</label>
        <textarea
          id="vocab_word_bank"
          value={JSON.stringify(vocab_word_bank || [], null, 2)}
          onChange={(event) => handleWordBankChange(event.target.value)}
          rows={4}
          className="font-mono"
          placeholder='["map", "library"]'
        />
        <p>Enter as JSON array of words</p>
      </div>
    </section>
  );
}
