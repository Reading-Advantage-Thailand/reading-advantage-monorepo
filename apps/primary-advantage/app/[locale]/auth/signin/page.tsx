import { StudentSignInForm } from "@/components/auth/student-signin-form";
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

export default async function SignInPage() {
  const t = await getTranslations("AuthPage.signin");

  return (
    <Tabs defaultValue="student">
      <TabsList className="w-full">
        <TabsTrigger value="student" className="cursor-pointer">
          <BookTextIcon />
          {t("student")}
        </TabsTrigger>
        <TabsTrigger value="teacher" className="cursor-pointer">
          <SchoolIcon />
          {t("teacher")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="student">
        <StudentSignInForm />
      </TabsContent>
      <TabsContent value="teacher">
        <TeacherSignInForm />
      </TabsContent>
    </Tabs>
  );
}
