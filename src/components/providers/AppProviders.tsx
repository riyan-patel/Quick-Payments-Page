"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@teispace/next-themes";

type Props = { children: ReactNode };

export function AppProviders({ children }: Props) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
