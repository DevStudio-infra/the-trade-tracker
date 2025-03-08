import { useState, useEffect } from "react";
import { useApi } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/router";

interface FormField {
  name: string;
  label: string;
  type: "text" | "password" | "select" | "multiselect" | "checkbox";
  options?: { label: string; value: string }[];
  required?: boolean;
}

interface OnboardingStep {
  title: string;
  description: string;
  fields: FormField[];
}

interface BrokerCredentials {
  apiKey: string;
  apiSecret: string;
}

type FormValue = string | string[] | boolean;

// Step-specific interfaces
interface ProfileData {
  name: string;
  tradingExperience: string;
}

interface PreferencesData {
  preferredMarkets: string[];
  riskTolerance: string;
}

interface BrokerData {
  brokerName: string;
  apiKey: string;
  apiSecret: string;
  isDemo: boolean;
}

// Combined form data type
type OnboardingFormData = Partial<ProfileData & PreferencesData & BrokerData>;

// Step data type
type OnboardingStepData = ProfileData | PreferencesData | { skipBroker: true } | { brokerName: string; credentials: BrokerCredentials; isDemo: boolean };

// Form field type
type FormFieldName = keyof (ProfileData & PreferencesData & BrokerData);

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Complete Your Profile",
    description: "Tell us a bit about yourself to get started.",
    fields: [
      {
        name: "name",
        label: "Full Name",
        type: "text",
        required: true,
      },
      {
        name: "tradingExperience",
        label: "Trading Experience",
        type: "select",
        options: [
          { label: "Beginner", value: "beginner" },
          { label: "Intermediate", value: "intermediate" },
          { label: "Advanced", value: "advanced" },
        ],
        required: true,
      },
    ],
  },
  {
    title: "Trading Preferences",
    description: "Set up your trading preferences.",
    fields: [
      {
        name: "preferredMarkets",
        label: "Preferred Markets",
        type: "multiselect",
        options: [
          { label: "Stocks", value: "stocks" },
          { label: "Forex", value: "forex" },
          { label: "Crypto", value: "crypto" },
          { label: "Commodities", value: "commodities" },
        ],
        required: true,
      },
      {
        name: "riskTolerance",
        label: "Risk Tolerance",
        type: "select",
        options: [
          { label: "Conservative", value: "conservative" },
          { label: "Moderate", value: "moderate" },
          { label: "Aggressive", value: "aggressive" },
        ],
        required: true,
      },
    ],
  },
  {
    title: "Connect Your Broker (Optional)",
    description: "Connect your trading account or skip this step for now.",
    fields: [
      {
        name: "brokerName",
        label: "Broker",
        type: "select",
        options: [
          { label: "Capital.com", value: "capital" },
          // Add more brokers here
        ],
      },
      {
        name: "apiKey",
        label: "API Key",
        type: "password",
      },
      {
        name: "apiSecret",
        label: "API Secret",
        type: "password",
      },
      {
        name: "isDemo",
        label: "Use Demo Account",
        type: "checkbox",
      },
    ],
  },
  {
    title: "Ready to Trade",
    description: "Your account is now set up and ready for trading.",
    fields: [],
  },
];

export default function OnboardingFlow() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const api = useApi();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await api.getUserProfile();
        if (profile.onboardingCompleted) {
          router.push("/dashboard");
        } else {
          setCurrentStep(profile.onboardingStep);
        }
      } catch (error) {
        setError(api.handleError(error).message);
      }
    };

    if (isSignedIn) {
      fetchUserProfile();
    }
  }, [isSignedIn, api, router]);

  const getFieldValue = (field: FormFieldName): FormValue | undefined => {
    return formData[field];
  };

  const setFieldValue = (field: FormFieldName, value: FormValue) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let stepData: OnboardingStepData;

      switch (currentStep) {
        case 1:
          if (!formData.name || !formData.tradingExperience) {
            throw new Error("Missing required profile fields");
          }
          stepData = {
            name: formData.name,
            tradingExperience: formData.tradingExperience,
          };
          break;

        case 2:
          if (!formData.preferredMarkets || !formData.riskTolerance) {
            throw new Error("Missing required preference fields");
          }
          stepData = {
            preferredMarkets: formData.preferredMarkets as string[],
            riskTolerance: formData.riskTolerance,
          };
          break;

        case 3:
          // Check if broker connection is being skipped
          if (!formData.brokerName && !formData.apiKey && !formData.apiSecret) {
            stepData = { skipBroker: true };
          } else {
            // Validate broker fields if they're being used
            if (!formData.brokerName || !formData.apiKey || !formData.apiSecret) {
              throw new Error("Please complete all broker fields or remove them to skip");
            }
            stepData = {
              brokerName: formData.brokerName,
              credentials: {
                apiKey: formData.apiKey,
                apiSecret: formData.apiSecret,
              },
              isDemo: Boolean(formData.isDemo),
            };
          }
          break;

        case 4:
          // Final step, no data needed
          stepData = { skipBroker: true };
          break;

        default:
          throw new Error("Invalid step");
      }

      const response = await api.submitOnboardingStep(currentStep, stepData);

      if (response.isComplete) {
        router.push("/dashboard");
      } else {
        setCurrentStep((prev) => prev + 1);
        setFormData({});
      }
    } catch (error) {
      setError(api.handleError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return <div>Loading...</div>;
  }

  const step = ONBOARDING_STEPS[currentStep - 1];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">{step.title}</h2>
        <p className="mt-2 text-center text-sm text-gray-600">{step.description}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step.fields.map((field) => (
              <div key={field.name}>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                <div className="mt-1">
                  {field.type === "select" ? (
                    <select
                      id={field.name}
                      name={field.name}
                      required={field.required}
                      value={(getFieldValue(field.name as FormFieldName) as string) || ""}
                      onChange={(e) => setFieldValue(field.name as FormFieldName, e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="">Select...</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "multiselect" ? (
                    <select
                      id={field.name}
                      name={field.name}
                      required={field.required}
                      multiple
                      value={(getFieldValue(field.name as FormFieldName) as string[]) || []}
                      onChange={(e) =>
                        setFieldValue(
                          field.name as FormFieldName,
                          Array.from(e.target.selectedOptions, (option) => option.value)
                        )
                      }
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      id={field.name}
                      name={field.name}
                      checked={(getFieldValue(field.name as FormFieldName) as boolean) || false}
                      onChange={(e) => setFieldValue(field.name as FormFieldName, e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  ) : (
                    <input
                      type={field.type}
                      id={field.name}
                      name={field.name}
                      required={field.required}
                      value={(getFieldValue(field.name as FormFieldName) as string) || ""}
                      onChange={(e) => setFieldValue(field.name as FormFieldName, e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  )}
                </div>
              </div>
            ))}

            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {isSubmitting ? "Processing..." : currentStep === 4 ? "Complete" : "Continue"}
              </button>

              {currentStep === 3 && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({});
                    const syntheticEvent = new Event("submit") as unknown as React.FormEvent;
                    handleSubmit(syntheticEvent);
                  }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Skip Broker Connection
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Step {currentStep} of {ONBOARDING_STEPS.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
