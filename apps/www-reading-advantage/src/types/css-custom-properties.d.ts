import "react";

declare module "react" {
  /** Allow inline CSS custom properties such as `{ "--delay": "100ms" }`. */
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
