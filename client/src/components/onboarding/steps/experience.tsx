"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { OnboardingData } from "@/services/onboarding";

interface OnboardingExperienceProps {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const experienceLevels = [
  {
    id: "beginner",
    title: "Beginner",
    description: "New to trading or have less than 1 year of experience",
  },
  {
    id: "intermediate",
    title: "Intermediate",
    description: "1-3 years of trading experience",
  },
  {
    id: "advanced",
    title: "Advanced",
    description: "3+ years of trading experience",
  },
];

const tradingStyles = [
  {
    id: "day",
    title: "Day Trading",
    description: "Multiple trades within a single day",
  },
  {
    id: "swing",
    title: "Swing Trading",
    description: "Holding positions for days to weeks",
  },
  {
    id: "position",
    title: "Position Trading",
    description: "Long-term positions lasting weeks to months",
  },
];

export function OnboardingExperience({ data, onChange, onNext, onBack }: OnboardingExperienceProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Your Trading Experience</h2>
        <p className="text-muted-foreground">Help us understand your trading background to provide personalized recommendations.</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-3">Experience Level</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {experienceLevels.map((level) => (
              <Card
                key={level.id}
                className={`p-4 cursor-pointer transition-all hover:border-primary ${data.experience === level.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => onChange({ experience: level.id })}>
                <h4 className="font-medium">{level.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">Preferred Trading Style</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {tradingStyles.map((style) => (
              <Card
                key={style.id}
                className={`p-4 cursor-pointer transition-all hover:border-primary ${data.tradingStyle === style.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => onChange({ tradingStyle: style.id })}>
                <h4 className="font-medium">{style.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{style.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={!data.experience || !data.tradingStyle}>
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
