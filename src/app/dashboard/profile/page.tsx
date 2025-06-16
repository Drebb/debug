"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";

export default function ProfilePage() {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Please log in</h2>
            <p className="text-gray-600">
              You need to be logged in to view your profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="text-gray-900">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">
                {user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">User ID</label>
              <p className="text-gray-900 font-mono text-sm">{user.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 