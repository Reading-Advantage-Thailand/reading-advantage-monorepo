import { Button } from "@reading-advantage/ui";

/**
 * Renders the Accounting landing page.
 * @returns The Accounting workspace landing page.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Accounting</h1>
      <p className="text-muted-foreground">
        Accounting workspace for Reading Advantage. Signed in with your company
        account; expense submission and the ledger are on the way.
      </p>
      <Button>Get started</Button>
    </main>
  );
}
