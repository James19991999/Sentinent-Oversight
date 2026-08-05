import type { ReactNode } from "react";

/**
 * Required root layout for the App Router when using next-intl with a
 * `[locale]` segment. The locale layout owns `<html>` / `<body>`; this
 * file only passes children through.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
