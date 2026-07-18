"use client";

import { useState, type FormEvent } from "react";

/** Secure first-party username and password sign-in panel. */
export function SignInPanel({ returnTo }: Readonly<{ returnTo: string }>) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
        clientId: "accounts",
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setMessage("The sign-in details could not be verified. Please try again.");
      return;
    }
    window.location.assign(returnTo);
  }

  return (
    <section className="signin-stage">
      <div className="signin-copy">
        <p className="eyebrow">EMPLOYEE ACCESS / 01</p>
        <h1>One key.<br /><em>Clear boundaries.</em></h1>
        <p className="lede">
          Sign in once to move between the company tools assigned to you. Company
          administration does not grant automatic access to Marketing, Sales, or Codecamp.
        </p>
        <div className="boundary-note">
          <b>Identity is shared.</b>
          <span>Product authority is not.</span>
        </div>
      </div>
      <form className="signin-card" onSubmit={submit}>
        <div className="card-index">ACCOUNTS / SECURE ENTRY</div>
        <label>
          <span>Username</span>
          <input name="username" autoComplete="username" required maxLength={64} autoFocus />
        </label>
        <label>
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {message && <p className="form-error" role="alert">{message}</p>}
        <button className="primary-action" disabled={busy}>
          <span>{busy ? "VERIFYING" : "ENTER ACCOUNTS"}</span><b aria-hidden="true">↗</b>
        </button>
        <p className="security-caption">Protected by an HttpOnly host-only session.</p>
      </form>
    </section>
  );
}
