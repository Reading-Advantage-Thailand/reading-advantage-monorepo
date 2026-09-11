"use client";
import React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenuItem } from "./ui/dropdown-menu";

type CopyKeyButtonProps = {
  copyText: string;
  onCopied?: () => void;
  onError?: () => void;
  asDropdownItem?: boolean;
  dropdownLabel?: React.ReactNode;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
  className?: string;
  title?: string;
  children?: React.ReactNode;
};

/**
 * Copies one key (or link) to the clipboard with a copied-state indicator.
 * @param props Text to copy plus rendering and callback options.
 * @returns A button, or a dropdown menu item when `asDropdownItem` is set.
 */
export default function CopyKeyButton({
  copyText,
  onCopied,
  onError,
  asDropdownItem = false,
  dropdownLabel,
  variant = "ghost",
  size = "sm",
  className,
  title,
  children,
}: CopyKeyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopied?.();
    } catch (err) {
      console.error("Failed to copy:", err);
      onError?.();
    }
  };

  if (asDropdownItem) {
    return (
      <DropdownMenuItem onClick={handleCopy}>
        {dropdownLabel ?? children}
      </DropdownMenuItem>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleCopy}
      title={title}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        children ?? <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
