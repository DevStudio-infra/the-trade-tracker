"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: "bg-gradient-to-r from-[hsl(var(--gradient-1))] to-[hsl(var(--gradient-2))] hover:opacity-90 transition-opacity",
            footerActionLink: "text-foreground hover:text-foreground/80",
          },
        }}
      />
    </div>
  );
}
