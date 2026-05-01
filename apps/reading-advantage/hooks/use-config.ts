import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { BaseColor } from "@/styles/theme-base-colors";
import { Style } from "@/styles/theme-base-style";

type Config = {
  style: Style["name"];
  theme: BaseColor["name"];
  radius: number;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
};

const configAtom = atomWithStorage<Config>("config", {
  style: "new-york",
  theme: "zinc",
  radius: 0.5,
  packageManager: "pnpm",
});

export function useConfig() {
  return useAtom(configAtom);
}
