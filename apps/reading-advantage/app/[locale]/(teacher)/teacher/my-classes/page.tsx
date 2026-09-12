import React from "react";
import MyClasses from "@/components/teacher/my-classes";
import Link from "next/link";

export default async function MyClassesPage() {
  return (
    <div>
      <Link href="../game-challenges">Class challenges</Link>
      <MyClasses />
    </div>
  );
}
