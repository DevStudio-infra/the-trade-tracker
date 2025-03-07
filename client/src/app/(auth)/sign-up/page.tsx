"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
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
