import { StudentSignInForm } from "@/components/auth/student-signin-form";
import { TeacherSignInForm } from "@/components/auth/teacher-signin-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookTextIcon, SchoolIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

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
