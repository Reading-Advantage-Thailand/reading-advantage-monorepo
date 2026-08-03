import type { ReactNode } from "react";
import { createDraftAction } from "./actions";

/**
 * Renders the "New draft" form for creating a workbook draft from a Reading
 * Advantage source payload.
 *
 * The form posts the raw source JSON plus tenant and creator identifiers to the
 * server action, which handles normalization and draft construction as domain
 * concerns.
 * @returns The new-draft form page.
 */
export default async function NewDraftPage(): Promise<ReactNode> {
  /**
   * Parses the submitted source JSON and delegates draft creation to the
   * createDraftAction server action.
   * @param formData The submitted form data containing source, tenantId and createdBy.
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
    await createDraftAction(
      parsed,
      String(formData.get("tenantId") ?? ""),
      String(formData.get("createdBy") ?? ""),
    );
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
          Tenant ID
          <input name="tenantId" required defaultValue="default" />
        </label>
        <label>
          Created by
          <input name="createdBy" required />
        </label>
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
