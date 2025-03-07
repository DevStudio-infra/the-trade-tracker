"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SignInDialog } from "@/components/auth/sign-in-dialog";

const navigation = [
  { name: "Docs", href: "/docs" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/contact" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative h-8 w-8">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {item.name}
              </Link>
            ))}
            <ThemeToggle />
            <SignedIn>
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-[hsl(var(--gradient-1))] to-[hsl(var(--gradient-2))] hover:opacity-90 text-white border-0 rounded-full px-6">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </SignedIn>
            <SignedOut>
              <SignInDialog>
                <Button size="sm" variant="outline" className="rounded-full px-6">
                  Sign In
                </Button>
              </SignInDialog>
            </SignedOut>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden">
            <ThemeToggle />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-4 mt-6">
                  {navigation.map((item) => (
                    <Link key={item.name} href={item.href} className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsOpen(false)}>
                      {item.name}
                    </Link>
                  ))}
                  <SignedIn>
                    <Button asChild className="bg-gradient-to-r from-[hsl(var(--gradient-1))] to-[hsl(var(--gradient-2))] hover:opacity-90 text-white border-0">
                      <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                        Dashboard
                      </Link>
                    </Button>
                  </SignedIn>
                  <SignedOut>
                    <SignInDialog>
                      <Button variant="outline">Sign In</Button>
                    </SignInDialog>
                  </SignedOut>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
