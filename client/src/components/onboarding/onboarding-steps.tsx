"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OnboardingWelcome } from "./steps/welcome";
import { OnboardingExperience } from "./steps/experience";
import { OnboardingPreferences } from "./steps/preferences";
import { OnboardingBroker } from "./steps/broker";
import { onboardingService, OnboardingData } from "@/services/onboarding";
import { useToast } from "@/components/ui/use-toast";

const steps = [
  { id: 1, title: "Welcome" },
  { id: 2, title: "Experience" },
  { id: 3, title: "Preferences" },
  { id: 4, title: "Connect Broker" },
];

export function OnboardingSteps() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [formData, setFormData] = React.useState<OnboardingData>({
    experience: "",
    tradingStyle: "",
    riskTolerance: "",
    preferredMarkets: [],
    broker: null,
  });

  const progress = (currentStep / steps.length) * 100;

  const handleNext = async () => {
    try {
      if (currentStep < steps.length) {
        await onboardingService.updateStatus(currentStep + 1, false, formData);
        setCurrentStep((prev) => prev + 1);
      } else {
        // Submit final onboarding data
        await onboardingService.updateStatus(currentStep, true, formData);
        toast({
          title: "Setup Complete",
          description: "Your trading preferences have been saved.",
        });
        router.push("/dashboard");
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = async () => {
    if (currentStep > 1) {
      await onboardingService.updateStatus(currentStep - 1, false, formData);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const updateFormData = (data: Partial<OnboardingData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  // Load saved progress
  React.useEffect(() => {
    async function loadProgress() {
      try {
        const status = await onboardingService.getStatus();
        if (status.current_step > 1) {
          setCurrentStep(status.current_step);
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to load your progress",
          variant: "destructive",
        });
      }
    }

    loadProgress();
  }, [toast]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((step) => (
            <div key={step.id} className={`flex items-center ${step.id === currentStep ? "text-primary" : step.id < currentStep ? "text-primary/80" : "text-muted-foreground"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step.id === currentStep ? "border-primary bg-primary/10" : step.id < currentStep ? "border-primary/80 bg-primary/80" : "border-muted"
                }`}>
                {step.id < currentStep ? <Check className="w-4 h-4 text-white" /> : <span>{step.id}</span>}
              </div>
              <span className="ml-2 hidden sm:inline">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Content */}
      <Card className="p-6">
        <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
          {currentStep === 1 && <OnboardingWelcome onNext={handleNext} />}
          {currentStep === 2 && <OnboardingExperience data={formData} onChange={updateFormData} onNext={handleNext} onBack={handleBack} />}
          {currentStep === 3 && <OnboardingPreferences data={formData} onChange={updateFormData} onNext={handleNext} onBack={handleBack} />}
          {currentStep === 4 && <OnboardingBroker data={formData} onChange={updateFormData} onNext={handleNext} onBack={handleBack} />}
        </motion.div>
      </Card>
    </div>
  );
}
