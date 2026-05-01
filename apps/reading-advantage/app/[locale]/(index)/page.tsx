import { Button } from "@/components/ui/button";
import { siteConfig } from "@/configs/site-config";
import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeatureBox } from "@/components/index/feature-box";
import {
  GitBranch,
  BrainCircuit,
  BarChart4,
  Book,
  BookOpen,
  Bot,
  Wrench,
  Volume2,
  Settings,
  Users,
  Sparkles,
} from "lucide-react";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getScopedI18n } from "@/locales/server";
import { getCurrentUser } from "@/lib/session";
import StartTour from "@/components/tour/StartTour";
import { buttonVariants } from "@/components/ui/button";

type Props = {};

export default async function IndexPage({}: Props) {
  const t = await getScopedI18n("pages.indexPage");
  const user = await getCurrentUser();

  return (
    <div>
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-3">
        <div className="container flex max-w-[64rem] py-36 flex-col items-center gap-4 text-center ">
          {user && !user.onborda ? <StartTour /> : null}
          <h1
            id="onborda-step1"
            className="font-heading animate-glow text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white"
          >
            {siteConfig.name}
          </h1>
          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl lg:text-6xl ">
            <span>Empower Your Students with</span>
            <span className="text-green-500"> AI-Enhanced </span>
            <span>Language Learning</span>
          </h2>
          <p className="max-w-[42rem] font-heading leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Revolutionize language education with our cutting-edge platform
          </p>
          <div className="relative md:mt-24">
            <div className="absolute -inset-2 rounded-lg bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-gray-600 via-purple-600 to-zinc-600 opacity-50 blur-2xl"></div>
            <div className="relative flex w-60 h-14 items-center justify-center border border-zinc-700 rounded-lg text-white bg-[#172554] font-heading text-xl cursor-pointer hover:scale-105 transition-transform duration-300 ease-in-out dark:bg-white dark:text-black">
              {user ? (
                <Link href="/student/read">Start Your Free Trial</Link>
              ) : (
                <Link href={"/auth/signin"}>Start Your Free Trial</Link>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="bg-[#172554]"></div>
    </div>
  );
}
