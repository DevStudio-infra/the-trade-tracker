import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col">
        {/* Hero Section */}
        <div className="flex-1 relative">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background to-background/80 dark:from-blue-950 dark:to-slate-900" />

          {/* Content */}
          <div className="relative pt-20 pb-24 container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mt-20 max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-8">
                Elevate Your <span className="bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 text-transparent bg-clip-text">Trading Game</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                Advanced algorithmic trading with automated execution, dynamic stop-losses, and AI-powered technical analysis.
              </p>
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/dashboard">Start Trading Now →</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
