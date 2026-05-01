import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
};

export function BenefitBox(props: Props) {
  return (
    <div
      className={cn(
        "hover:scale-105 transition-transform duration-300 ease-in-out cursor-pointer hover:shadow-2xl hover:rotate-2",
        "h-56 flex flex-col items-center text-white w-60 text-center shadow-xl p-6 rounded-lg bg-[#1d2e64] hover:bg-[#2f3e7f]"
      )}
    >
      <h3 className="text-lg font-bold mb-2 mt-4">{props.title}</h3>
      <p className="text-sm">{props.description}</p>
    </div>
  );
}
