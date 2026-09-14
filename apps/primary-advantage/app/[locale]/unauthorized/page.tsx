import { Link } from "@/i18n/navigation";

/**
 * Explains a role-denied navigation and links back home.
 * @returns The unauthorized page.
 */
export default function UnauthorizedPage() {
  return (
    <div className="container flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Unauthorized</h1>
      <p className="text-muted-foreground">
        Your account does not have access to this page.
      </p>
      <Link href="/" className="underline">
        Back to home
      </Link>
    </div>
  );
}
