import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore our amazing features",
};

export default function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">Our Features</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">Discover what makes our platform unique</p>
      </div>
      {/* Add your features content here */}
    </div>
  );
}
