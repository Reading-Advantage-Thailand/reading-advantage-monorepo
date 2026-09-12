"use client";

import type { PedagogicalConnectorsEditorProps } from "./types";

/**
 * Edits the pedagogical connectors section of a workbook lesson: the
 * connection question, the grammar search term, the phonics focus, and the
 * discussion question. Each field persists through its normalized contract
 * carrier.
 *
 * @param props - Current connector values plus an onChange callback; see PedagogicalConnectorsEditorProps.
 * @returns The Pedagogical Connectors section.
 */
export function PedagogicalConnectorsEditor({
  connection_question,
  grammar_search_term,
  phonics_focus,
  discussion_question,
  onChange,
}: PedagogicalConnectorsEditorProps) {
  return (
    <section aria-labelledby="pedagogical-connectors-heading">
      <h2 id="pedagogical-connectors-heading">Pedagogical Connectors</h2>
      <div>
        <label htmlFor="connection_question">Connection Question</label>
        <textarea
          id="connection_question"
          value={connection_question || ""}
          onChange={(event) =>
            onChange("connection_question", event.target.value)
          }
          rows={2}
          placeholder="Question connecting article to student's life or experience..."
          aria-describedby="connection_question-hint"
        />
        <p id="connection_question-hint">
          Helps students connect the article content to their own experiences
        </p>
      </div>
      <div>
        <label htmlFor="grammar_search_term">Grammar Search Term</label>
        <input
          id="grammar_search_term"
          value={grammar_search_term || ""}
          onChange={(event) =>
            onChange("grammar_search_term", event.target.value)
          }
          placeholder="e.g., simple past, present perfect..."
          aria-describedby="grammar_search_term-hint"
        />
        <p id="grammar_search_term-hint">
          Grammar pattern for students to identify in the article (CEFR-aware)
        </p>
      </div>
      <div>
        <label htmlFor="phonics_focus">Phonics Focus</label>
        <input
          id="phonics_focus"
          value={phonics_focus || ""}
          onChange={(event) => onChange("phonics_focus", event.target.value)}
          placeholder="e.g., short a, th digraph..."
          aria-describedby="phonics_focus-hint"
        />
        <p id="phonics_focus-hint">
          Sound-spelling pattern students practice in the lesson
        </p>
      </div>
      <div>
        <label htmlFor="discussion_question">Discussion Question</label>
        <textarea
          id="discussion_question"
          value={discussion_question || ""}
          onChange={(event) =>
            onChange("discussion_question", event.target.value)
          }
          rows={2}
          placeholder="Open-ended question for class discussion..."
          aria-describedby="discussion_question-hint"
        />
        <p id="discussion_question-hint">
          Thought-provoking question for deeper engagement with the topic
        </p>
      </div>
    </section>
  );
}
