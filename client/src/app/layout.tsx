import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkThemeProvider } from "@/components/clerk-theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { QueryProvider } from "@/providers/query-provider";
import { NotificationsProvider } from "@/providers/notifications-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { Footer } from "@/components/layout/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Trade Tracker - Advanced Algorithmic Trading with AI",
  description: "Advanced algorithmic trading with automated execution, dynamic stop-losses, and AI-powered technical analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClerkThemeProvider>
            <QueryProvider>
              <NotificationsProvider>
                <Navbar />
                <main className="pt-16">{children}</main>
                <Footer />
                <Toaster />
              </NotificationsProvider>
            </QueryProvider>
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
