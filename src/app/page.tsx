"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 bg-white shadow-sm">
        <div className="text-2xl font-bold text-gray-800">MyApp</div>
        <div>
          <Authenticated>
            <UserButton />
          </Authenticated>
          <Unauthenticated>
            <SignInButton mode="modal">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Sign In
              </button>
            </SignInButton>
          </Unauthenticated>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <Unauthenticated>
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Welcome to MyApp
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              A simple and elegant application with secure authentication. Sign
              in to access your personalized dashboard and features.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">🔐</div>
                <h3 className="text-xl font-semibold mb-2">
                  Secure Authentication
                </h3>
                <p className="text-gray-600">
                  Powered by Clerk for enterprise-grade security and user
                  management.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                <p className="text-gray-600">
                  Built with Next.js and modern web technologies for optimal
                  performance.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2">
                  Personal Dashboard
                </h3>
                <p className="text-gray-600">
                  Access your personalized dashboard with all your important
                  information.
                </p>
              </div>
            </div>

            <div className="mt-12">
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg">
                  Get Started
                </button>
              </SignInButton>
            </div>
          </div>
        </Unauthenticated>

        <Authenticated>
          <WelcomeBack />
        </Authenticated>
      </main>
    </div>
  );
}

function WelcomeBack() {
  const { user } = useUser();

  return (
    <div className="text-center max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome back, {user?.firstName || "there"}! 👋
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        You're successfully signed in. Ready to explore your dashboard?
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Link href="/dashboard" className="group">
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-blue-200">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-2xl font-semibold mb-2 text-gray-800">
              Dashboard
            </h3>
            <p className="text-gray-600">
              View your personal dashboard with analytics and insights.
            </p>
            <div className="mt-4 text-blue-600 font-medium group-hover:text-blue-700">
              Go to Dashboard →
            </div>
          </div>
        </Link>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-4xl mb-4">⚙️</div>
          <h3 className="text-2xl font-semibold mb-2 text-gray-800">
            Settings
          </h3>
          <p className="text-gray-600">
            Manage your account settings and preferences.
          </p>
          <div className="mt-4 text-gray-400">Coming Soon</div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h4 className="text-lg font-semibold text-blue-900 mb-2">
          Account Information
        </h4>
        <div className="text-blue-800">
          <p>
            <strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}
          </p>
          <p>
            <strong>Member since:</strong>{" "}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
