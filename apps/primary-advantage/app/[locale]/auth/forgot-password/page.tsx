import { UserResetPassForm } from "@/components/auth/user-reset-pass-form";
import type { Metadata } from "next";

/** Static metadata for the password-reset page. */
export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your Primary Advantage password.",
};

export default function ForgotPasswordPage() {
  return <UserResetPassForm />;
}
