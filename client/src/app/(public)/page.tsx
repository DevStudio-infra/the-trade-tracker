import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold">
                Your App
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <SignedIn>
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Sign In</button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Welcome to Your App</h1>
          <p className="text-xl text-gray-600 mb-8">A secure application with authentication powered by Clerk</p>
          <SignedOut>
            <div className="space-x-4">
              <Link href="/sign-up" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 inline-block">
                Get Started
              </Link>
            </div>
          </SignedOut>
        </div>
      </main>
    </div>
  );
}
