import { Header } from "@/components/header";
import MyClasses from "@/components/teacher/my-classes";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function MyClassesPage() {
  const t = await getTranslations("TeacherMyClasses.page");
  return (
    <div className="flex flex-col gap-2">
      <Header heading={t("title")} text={t("description")} />
      <Link href="../game-challenges">Class challenges</Link>
      <MyClasses />
    </div>
  );
}
