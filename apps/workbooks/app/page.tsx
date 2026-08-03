import type { ReactNode } from "react";

/**
 * Landing page for the workbook publishing platform.
 * @returns The publishing workspace placeholder view.
 */
export default function HomePage(): ReactNode {
  return (
    <main>
      <h1>Workbook Publishing</h1>
      <p>
        Internal curriculum publishing platform. Source content is owned by Reading
        Advantage and Primary Advantage; this application produces immutable,
        auditable workbook editions from that content.
      </p>
      <ul>
        <li>Drafts are optimistic-concurrency controlled.</li>
        <li>Editions are immutable, versioned, supersedable, and revocable.</li>
        <li>Publication is idempotent and transactional.</li>
      </ul>
    </main>
  );
}
