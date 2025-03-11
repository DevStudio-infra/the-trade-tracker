import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="container pb-32 mx-auto">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-[32px] overflow-hidden transform transition-transform duration-500 hover:scale-[1.02]">
          {/* Background with blur */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
          <div className="absolute inset-[1px] bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-[32px]" />

          {/* Content */}
          <div className="relative p-12 md:p-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start Trading Smarter Today</h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto text-lg">Begin with 10 free AI credits monthly. Experience the power of AI-driven trading with no commitments.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full bg-white text-blue-600 hover:bg-white/90 transform transition-transform duration-500 hover:scale-105">
                <Link href="/dashboard">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-white text-white hover:bg-white/10 transform transition-transform duration-500 hover:scale-105">
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
