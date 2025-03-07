import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignInDialog } from "@/components/auth/sign-in-dialog";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col">
        {/* Hero Section */}
        <div className="flex-1 relative overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 gradient-bg" />

          {/* Content */}
          <div className="relative pt-20 pb-24 container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mt-20 max-w-3xl mx-auto text-center">
              <div className="glow-effect mb-8">
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight">
                  Elevate Your <span className="gradient-heading inline-block mt-2">Trading Game</span>
                </h1>
              </div>
              <p className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                Advanced algorithmic trading with automated execution, dynamic stop-losses, and AI-powered technical analysis.
              </p>
              <SignedIn>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-8 bg-gradient-to-r from-[hsl(var(--gradient-1))] to-[hsl(var(--gradient-2))] hover:opacity-90 transition-opacity border-0 text-white shadow-lg">
                  <Link href="/dashboard">Go to Dashboard →</Link>
                </Button>
              </SignedIn>
              <SignedOut>
                <SignInDialog>
                  <Button
                    size="lg"
                    className="rounded-full px-8 bg-gradient-to-r from-[hsl(var(--gradient-1))] to-[hsl(var(--gradient-2))] hover:opacity-90 transition-opacity border-0 text-white shadow-lg">
                    Get Started Now →
                  </Button>
                </SignInDialog>
              </SignedOut>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
