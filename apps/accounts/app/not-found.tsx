import Link from "next/link";

/** Renders the Accounts not-found boundary. */
export default function NotFound() {
  return (
    <main className="shell">
      <div className="grid-haze" aria-hidden="true" />
      <section className="access-ledger">
        <p className="eyebrow">IDENTITY OFFICE / 404</p>
        <h1>Page not found.</h1>
        <p>The requested Accounts page does not exist.</p>
        <Link className="quiet-action" href="/">RETURN TO ACCOUNTS</Link>
      </section>
    </main>
  );
}
