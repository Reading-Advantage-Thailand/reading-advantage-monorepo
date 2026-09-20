"use client";

import Link from "next/link";

/** Renders a recoverable Accounts error boundary. */
export default function AccountsError({ reset }: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main className="shell">
      <div className="grid-haze" aria-hidden="true" />
      <section className="access-ledger" role="alert">
        <p className="eyebrow">IDENTITY OFFICE / ERROR</p>
        <h1>Accounts is unavailable.</h1>
        <p>The identity service did not load. Try again or return to Accounts.</p>
        <div className="action-row">
          <button className="quiet-action" onClick={() => reset()}>TRY AGAIN</button>
          <Link className="quiet-action" href="/">RETURN TO ACCOUNTS</Link>
        </div>
      </section>
    </main>
  );
}
