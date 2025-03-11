"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: "#1e40af",
          colorTextOnPrimaryBackground: "white",
        },
        elements: {
          card: "shadow-none p-6",
          rootBox: "flex items-center justify-center ",
          modalContent: "p-6",
        },
      }}>
      {children}
    </ClerkProvider>
  );
}
