"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { OnboardingData } from "@/services/onboarding";

interface OnboardingBrokerProps {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const brokers = [
  {
    id: "capital",
    name: "Capital.com",
    description: "Leading broker with a wide range of assets",
    logo: "/brokers/capital.png",
  },
  {
    id: "binance",
    name: "Binance",
    description: "Popular cryptocurrency exchange",
    logo: "/brokers/binance.png",
    comingSoon: true,
  },
  {
    id: "mt4",
    name: "MetaTrader 4",
    description: "Classic forex and CFD trading platform",
    logo: "/brokers/mt4.png",
    comingSoon: true,
  },
];

export function OnboardingBroker({ onChange, onNext, onBack }: OnboardingBrokerProps) {
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isDemo, setIsDemo] = useState(true);

  const handleBrokerSelect = (brokerId: string) => {
    const broker = brokers.find((b) => b.id === brokerId);
    if (broker?.comingSoon) return;
    setSelectedBroker(brokerId);
  };

  const handleConnect = () => {
    if (!selectedBroker || !apiKey || !apiSecret) return;

    onChange({
      broker: {
        name: selectedBroker,
        apiKey,
        apiSecret,
        isDemo,
      },
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Connect Your Broker</h2>
        <p className="text-muted-foreground">Connect your trading account to enable automated trading.</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Select Broker</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {brokers.map((broker) => (
              <Card
                key={broker.id}
                className={`p-4 cursor-pointer transition-all hover:border-primary relative ${selectedBroker === broker.id ? "border-primary bg-primary/5" : ""} ${
                  broker.comingSoon ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => handleBrokerSelect(broker.id)}>
                <div className="h-12 w-12 mb-4 relative">{/* Add broker logo image here */}</div>
                <h4 className="font-medium">{broker.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{broker.description}</p>
                {broker.comingSoon && <div className="absolute top-2 right-2 text-xs font-medium text-muted-foreground">Coming Soon</div>}
              </Card>
            ))}
          </div>
        </div>

        {selectedBroker && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-4">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input id="apiKey" placeholder="Enter your API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input id="apiSecret" type="password" placeholder="Enter your API secret" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDemo"
                  checked={isDemo}
                  onChange={(e) => setIsDemo(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isDemo">Use demo account for practice</Label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleConnect} disabled={!selectedBroker || !apiKey || !apiSecret}>
          Complete Setup <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
