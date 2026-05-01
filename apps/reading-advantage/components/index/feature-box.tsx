import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Icons } from "../icons";
import { Bot, LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

export function FeatureBox(props: Props) {
  return (
    <div className="relative overflow-hidden rounded-lg border p-2 shadow-2xl bg-[#1d2e64] hover:bg-[#2f3e7f] hover:scale-105 transition-transform duration-300 ease-in-out cursor-pointer hover:rotate-2 text-white border-none">
      <div className="flex h-[200px] flex-col justify-between rounded-md p-6">
        {props.icon && <props.icon className="h-12 w-12" />}
        <div className="space-y-2">
          <h3 className="font-bold">{props.title}</h3>
          <p className="text-sm text-gray-400">{props.description}</p>
        </div>
      </div>
    </div>
  );
}
