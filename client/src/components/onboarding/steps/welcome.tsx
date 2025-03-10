"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface OnboardingWelcomeProps {
  onNext: () => void;
}

export function OnboardingWelcome({ onNext }: OnboardingWelcomeProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">Welcome to The Trade Tracker</h2>
        <p className="text-muted-foreground">Let's set up your account to get the most out of your trading experience.</p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <h3 className="font-semibold mb-2">What you'll get:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Personalized trading strategies based on your experience</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>AI-powered trade signals tailored to your preferences</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Automated trade execution with your preferred broker</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Risk management settings customized to your style</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onNext} className="w-full sm:w-auto">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
