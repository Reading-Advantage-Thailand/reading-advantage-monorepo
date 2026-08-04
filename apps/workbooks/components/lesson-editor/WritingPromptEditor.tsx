"use client";

import type { WritingPromptEditorProps } from "./types";
import { useJsonField } from "./use-json-field";

/**
 * Edits the writing prompt section of a workbook lesson: the prompt, the plan
 * prompts, the sentence frames, and the sentence starters (as JSON arrays).
 * The visual-break image workflow is excluded in this phase: image generation
 * routes through @reading-advantage/ai as proposal-only work (FR-11).
 *
 * Each JSON field keeps its raw text in local state so intermediate invalid
 * fragments remain typeable; only successful parses propagate upward, and
 * invalid input surfaces an inline parse error.
 * @param props - Current writing values plus an onChange callback; see WritingPromptEditorProps.
 * @returns The Writing Prompt section.
 */
export function WritingPromptEditor({
  writing_prompt,
  writing_plan_prompts,
  writing_sentence_frames,
  sentence_starters,
  onChange,
}: WritingPromptEditorProps) {
  const planPromptsField = useJsonField(
    writing_plan_prompts,
    (value) => JSON.stringify(value ?? []),
    (parsed) => onChange("writing_plan_prompts", parsed as string[]),
  );
  const sentenceFramesField = useJsonField(
    writing_sentence_frames,
    (value) => JSON.stringify(value ?? []),
    (parsed) => onChange("writing_sentence_frames", parsed as string[]),
  );
  const sentenceStartersField = useJsonField(
    sentence_starters,
    (value) => JSON.stringify(value ?? []),
    (parsed) => onChange("sentence_starters", parsed as string[]),
  );

  return (
    <section aria-labelledby="writing-prompt-heading">
      <h2 id="writing-prompt-heading">Writing Prompt</h2>
      <p>
        The visual break image workflow is deferred (image features are
        proposal-only via @reading-advantage/ai).
      </p>
      <div>
        <label htmlFor="writing_prompt">Writing Prompt</label>
        <textarea
          id="writing_prompt"
          value={writing_prompt || ""}
          onChange={(event) => onChange("writing_prompt", event.target.value)}
          rows={4}
          placeholder="Writing prompt for students..."
        />
      </div>
      <div>
        <label htmlFor="writing_plan_prompts">Writing Plan Prompts</label>
        <textarea
          id="writing_plan_prompts"
          value={planPromptsField.value}
          onChange={(event) => planPromptsField.handleChange(event.target.value)}
          rows={3}
          className="font-mono"
          placeholder='["Main idea / discovery:", "Key details to include:", "Vocabulary I will use:", "Why this discovery matters:"]'
          aria-describedby="writing_plan_prompts-hint"
        />
        {planPromptsField.error && (
          <p id="writing_plan_prompts-error" role="alert">
            {planPromptsField.error}
          </p>
        )}
        <p id="writing_plan_prompts-hint">Enter as JSON array of strings</p>
      </div>
      <div>
        <label htmlFor="writing_sentence_frames">Writing Sentence Frames</label>
        <textarea
          id="writing_sentence_frames"
          value={sentenceFramesField.value}
          onChange={(event) => sentenceFramesField.handleChange(event.target.value)}
          rows={3}
          className="font-mono"
          placeholder='["First, I will...", "Then, I will..."]'
          aria-describedby="writing_sentence_frames-hint"
        />
        {sentenceFramesField.error && (
          <p id="writing_sentence_frames-error" role="alert">
            {sentenceFramesField.error}
          </p>
        )}
        <p id="writing_sentence_frames-hint">
          Sentence starters to scaffold student writing (JSON array)
        </p>
      </div>
      <div>
        <label htmlFor="sentence_starters">Sentence Starters</label>
        <textarea
          id="sentence_starters"
          value={sentenceStartersField.value}
          onChange={(event) => sentenceStartersField.handleChange(event.target.value)}
          rows={3}
          className="font-mono"
          placeholder='["The map shows...", "I discovered that..."]'
          aria-describedby="sentence_starters-hint"
        />
        {sentenceStartersField.error && (
          <p id="sentence_starters-error" role="alert">
            {sentenceStartersField.error}
          </p>
        )}
        <p id="sentence_starters-hint">
          Sentence starters to scaffold student writing (JSON array)
        </p>
      </div>
    </section>
  );
}
