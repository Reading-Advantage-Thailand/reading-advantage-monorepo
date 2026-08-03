import type { ReactNode } from "react";
import { createDraftAction } from "./actions";

/**
 * Renders the "New draft" form for creating a workbook draft from a Reading
 * Advantage source payload.
 *
 * The form posts the raw source JSON to the server action; the tenant and
 * creator come from the signed-in session. The action handles normalization
 * and draft construction as domain concerns.
 * @returns The new-draft form page.
 */
export default async function NewDraftPage(): Promise<ReactNode> {
  /**
   * Parses the submitted source JSON and delegates draft creation to the
   * createDraftAction server action. The tenant and creator come from the
   * signed-in session, never from the form.
   * @param formData The submitted form data containing the source payload.
   * @returns Nothing; invalid JSON is silently ignored.
   */
  async function submit(formData: FormData) {
    "use server";

    const source = String(formData.get("source") ?? "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch {
      return;
    }
    await createDraftAction(parsed);
  }

  return (
    <main>
      <h1>New draft</h1>
      <p>
        Source content stays owned by Reading Advantage; only the draft is created
        here.
      </p>
      <form action={submit}>
        <label>
          Source
          <textarea
            name="source"
            required
            rows={12}
            placeholder="Paste the Reading Advantage article JSON"
          />
        </label>
        <button type="submit">Create draft</button>
      </form>
    </main>
  );
}
