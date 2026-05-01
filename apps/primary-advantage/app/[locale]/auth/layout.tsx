import React from "react";
import Image from "next/image";
import { siteConfig } from "@/configs/site-config";
import { Link } from "@/i18n/navigation";
import { Icons } from "@/components/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container grid h-screen items-center px-4 py-6">
      <div className="dark:bg-background overflow-hidden bg-slate-50 shadow-sm md:rounded-lg md:border md:border-solid">
        <div className="over grid md:h-[800px] lg:max-w-none lg:grid-cols-2 lg:px-0">
          <div className="over bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r">
            <Image
              // src="https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/article-images/3OdR9eoaNqmHfxV3KnHW.png"
              src="/login-image.png"
              alt="Image"
              className="absolute inset-0 h-full w-full rounded-s-xl bg-zinc-900 bg-center bg-no-repeat object-cover opacity-80 dark:opacity-70"
              width={512}
              height={512}
            />
            <Link
              href="/"
              className="flex items-center space-x-2 drop-shadow-md"
            >
              <Icons.logo />
              <div className="relative z-20 flex items-center text-lg font-bold drop-shadow-lg">
                {siteConfig.name}
              </div>
            </Link>
            <div className="relative z-20 mt-auto">
              <p className="text-lg drop-shadow-lg">{siteConfig.description}</p>
            </div>
          </div>
          <div className="flex w-full items-center justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
