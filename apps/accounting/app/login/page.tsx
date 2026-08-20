import { Button } from "@reading-advantage/ui";

/**
 * Renders the single company-account handoff for Accounting.
 * @returns The company-account sign-in landing page.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Accounting sign in</h1>
      <p className="text-muted-foreground">
        Use your company account to access the accounting workspace.
      </p>
      <Button asChild>
        <a href="/api/auth/company/start">Sign in with Company SSO</a>
      </Button>
    </main>
  );
}
