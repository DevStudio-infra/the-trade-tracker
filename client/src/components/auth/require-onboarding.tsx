"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { onboardingService } from "@/services/onboarding";
import { useToast } from "@/components/ui/use-toast";

export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function checkOnboarding() {
      try {
        if (isSignedIn) {
          const status = await onboardingService.getStatus();
          if (!status.onboarding_completed) {
            router.push("/onboarding");
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to check onboarding status",
          variant: "destructive",
        });
      }
    }

    if (isLoaded) {
      checkOnboarding();
    }
  }, [isSignedIn, isLoaded, router, toast]);

  return <>{children}</>;
}
