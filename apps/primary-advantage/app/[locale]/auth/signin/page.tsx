import { StudentSignIn } from "@/components/student-login/student-sign-in";
import { TeacherSignInForm } from "@/components/auth/teacher-signin-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookTextIcon, SchoolIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Localizes the sign-in page metadata.
 * @param params Route parameters carrying the locale.
 * @returns Title and description metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AuthPage.signin" });
  return { title: t("title"), description: t("welcome") };
}

/**
 * Sign-in page with a student tab (class code, picture password, or username and password) and
 * a staff tab (username and password).
 * @returns The page.
 */
export default async function SignInPage() {
  const t = await getTranslations("AuthPage.signin");

  return (
    <Tabs defaultValue="student" className="w-full max-w-md p-4">
      <TabsList className="h-auto w-full">
        <TabsTrigger value="student" className="min-h-12 cursor-pointer text-base motion-reduce:transition-none">
          <BookTextIcon />
          {t("student")}
        </TabsTrigger>
        <TabsTrigger value="teacher" className="min-h-12 cursor-pointer text-base motion-reduce:transition-none">
          <SchoolIcon />
          {t("teacher")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="student">
        <StudentSignIn />
      </TabsContent>
      <TabsContent value="teacher">
        <TeacherSignInForm />
      </TabsContent>
    </Tabs>
  );
}
