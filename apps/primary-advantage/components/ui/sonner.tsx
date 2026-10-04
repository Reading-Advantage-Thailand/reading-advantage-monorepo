"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

/** Bottom offset that keeps toasts above the mobile bottom bar (see --bottom-nav-h). */
const ABOVE_BOTTOM_NAV = { bottom: "calc(var(--bottom-nav-h) + 1rem)" }
/** Tablet and desktop offset: above the bar below 1024 px, 24 px from 1024 px (globals.css). */
const TOAST_OFFSET = { bottom: "var(--toast-offset-bottom)" }

/**
 * Renders the app toaster in the current theme. Below 1024 px (phones and tablets) the
 * toasts sit above the bottom bar.
 * @param props Sonner toaster props; they override the defaults.
 * @returns The toaster.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      offset={TOAST_OFFSET}
      mobileOffset={ABOVE_BOTTOM_NAV}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
