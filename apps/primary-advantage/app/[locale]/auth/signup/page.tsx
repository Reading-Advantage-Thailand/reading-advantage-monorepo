import { SignUpForm } from "@/components/auth/user-signup-form";
import type { Metadata } from "next";

/** Static metadata for the sign-up page. */
export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your Primary Advantage account.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
