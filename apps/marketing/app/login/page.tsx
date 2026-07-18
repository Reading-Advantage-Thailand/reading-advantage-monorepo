/** Renders the single company-account handoff for Marketing. */
export default function LoginPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "32px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <p style={{ marginBottom: "8px", color: "#6b7280", textAlign: "center" }}>
          READING ADVANTAGE / COMPANY ACCESS
        </p>
        <h1 style={{ marginBottom: "12px", textAlign: "center" }}>Marketing sign in</h1>
        <p style={{ marginBottom: "24px", textAlign: "center" }}>
          Continue to Accounts with your company username and password.
        </p>
        <a
          href="/api/auth/company/start"
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#1a1a2e",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: 600,
            display: "block",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          CONTINUE WITH ACCOUNTS
        </a>
      </section>
    </div>
  );
}
