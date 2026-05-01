import { Resend } from 'resend';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Lazy initialization of Resend client to avoid build-time errors
let resend: Resend | null = null;
const getResendClient = () => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY is not set');
      // Return a mock during build time
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return null;
      }
      throw new Error('RESEND_API_KEY is required');
    }
    resend = new Resend(apiKey);
  }
  return resend;
};

export async function sendPasswordResetEmail(email: string, token: string) {
  console.log("Preparing to send reset email to:", email, "with token:", token);
  console.log("RESEND_API_KEY", process.env.RESEND_API_KEY);
  console.log("RESEND_FROM", process.env.RESEND_FROM);
  
  const resendClient = getResendClient();
  if (!resendClient) {
    console.warn('⚠️  Resend client not available (build time)');
    return;
  }
  
  try {
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const result = await resendClient.emails.send({
      from: process.env.RESEND_FROM || 'no-reply@reading-advantage.com',
      to: email,
      subject: "Reset your password",
      html: `...`,
    });
    console.log("Resend result:", result);
  } catch (err) {
    console.error("Resend error:", err);
    throw err;
  }
}