"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
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

export function OnboardingBroker({ data, onChange, onNext, onBack }: OnboardingBrokerProps) {
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [favoritebroker, setFavoriteBroker] = useState<string>(data.favoritebroker || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [brokerSection, setBrokerSection] = useState<"select" | "connect" | "favorite">("select");

  const handleBrokerSelect = (brokerId: string) => {
    const broker = brokers.find((b) => b.id === brokerId);
    if (broker?.comingSoon) return;
    setSelectedBroker(brokerId);
    setBrokerSection("connect");
  };

  const handleConnect = () => {
    if (!selectedBroker || !apiKey) return;

    onChange({
      broker: {
        name: selectedBroker,
        apiKey,
        identifier,
        password,
      },
      favoritebroker,
    });
    onNext();
  };

  const handleSkip = () => {
    // Save favorite broker if provided, otherwise pass null for broker
    onChange({
      broker: null,
      favoritebroker,
    });
    onNext();
  };

  const handleSelectFavoriteBroker = () => {
    setBrokerSection("favorite");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Connect Your Broker</h2>
        <p className="text-muted-foreground">Connect your trading account to enable automated trading.</p>
      </div>

      {brokerSection === "select" && (
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
                  <div className="h-12 w-12 mb-4 relative">{/* You can add broker logo image here */}</div>
                  <h4 className="font-medium">{broker.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{broker.description}</p>
                  {broker.comingSoon && <div className="absolute top-2 right-2 text-xs font-medium text-muted-foreground">Coming Soon</div>}
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="favoritebroker">What&apos;s your favorite broker?</Label>
              <Input id="favoritebroker" placeholder="Enter your favorite broker name" value={favoritebroker} onChange={(e) => setFavoriteBroker(e.target.value)} />
              <p className="text-xs text-muted-foreground">This helps us prioritize which brokers to support next. Your feedback matters!</p>
            </div>
          </div>

          <div className="text-center space-y-2 mt-6">
            <p className="text-sm text-muted-foreground">Don&apos;t want to connect a broker now? You can do it later in settings.</p>
          </div>
        </div>
      )}

      {brokerSection === "connect" && selectedBroker === "capital" && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-4">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="identifier">Identifier</Label>
                <Input id="identifier" placeholder="Enter your identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              <p>You can find your API credentials in your Capital.com account settings under the API section.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBrokerSection("select")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to broker selection
          </Button>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {brokerSection === "select" ? (
          <div className="space-x-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button disabled={false} onClick={favoritebroker ? handleSkip : handleSelectFavoriteBroker}>
              {favoritebroker ? "Skip & Save Preference" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-x-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button onClick={handleConnect} disabled={!selectedBroker || !apiKey}>
              Complete Setup <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
