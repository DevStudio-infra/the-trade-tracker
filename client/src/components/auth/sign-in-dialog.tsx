"use client";

import * as React from "react";
import { SignIn } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface SignInDialogProps {
  children: React.ReactNode;
}

export function SignInDialog({ children }: SignInDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-0 border-0">
        <SignIn
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-fit",
              card: "shadow-none p-0",
              formButtonPrimary: "bg-gradient-to-r from-[hsl(var(--gradient-1))] to-[hsl(var(--gradient-2))] hover:opacity-90 transition-opacity",
              footerActionLink: "text-foreground hover:text-foreground/80",
            },
          }}
          signUpUrl="/sign-up"
        />
      </DialogContent>
    </Dialog>
  );
}
