import { Metadata } from "next";
import React from "react";
import AuthorsTabs from "@/components/authorsTabs";

export const metadata: Metadata = {
  title: "Authors",
};

type Props = {};

export default function AuthorsPage({}: Props) {
  return (
    <>
      <AuthorsTabs />
    </>
  );
}
