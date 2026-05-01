import { EmailTemplate } from "@/components/auth/email-forgot-password-template";
// import { resend } from "@/utils/resend";

export async function POST() {
  try {
    // const { data, error } = await resend.emails.send({
    //   from: "Acme <onboarding@resend.dev>",
    //   to: ["mr.jaturapat.d@gmail.com"],
    //   subject: "Hello world",
    //   react: EmailTemplate({ firstName: "John" }),
    // });

    // if (error) {
    //   return Response.json({ error }, { status: 500 });
    // }

    return Response.json({ message: "Email sent" });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
