import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Our pricing plans and packages",
};

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">Pricing Plans</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">Choose the perfect plan for your needs</p>
      </div>
      {/* Add your pricing content here */}
    </div>
  );
}
