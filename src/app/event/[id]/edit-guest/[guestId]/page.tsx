"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export default function EditIndividualGuestPage() {
  const { id, guestId } = useParams();
  const eventId = id as Id<"events">;
  const guestIdParam = guestId as Id<"guests">;
  const router = useRouter();
  const { user } = useUser();

  // Get Convex user (with _id)
  const currentUser = useQuery(api.users.currentUser);
  const convexUserId = currentUser?._id;

  const [guestData, setGuestData] = useState({
    nickname: "",
    email: "",
    socialHandle: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const event = useQuery(
    api.events.getEventById,
    eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );

  const guestList = useQuery(
    api.guests.getGuestList,
    eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );

  const updateGuest = useMutation(api.guests.updateGuestRecord);

  // Find the specific guest from the guest list
  const guest = guestList?.find((g) => g._id === guestIdParam);

  // Update form data when guest data loads
  useEffect(() => {
    if (guest) {
      setGuestData({
        nickname: guest.nickname,
        email: guest.email || "",
        socialHandle: guest.socialHandle || "",
      });
    }
  }, [guest]);

  const handleUpdateGuest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!convexUserId) {
      alert("You must be logged in to update guests");
      return;
    }

    if (!guestData.nickname.trim()) {
      alert("Nickname is required.");
      return;
    }

    setIsLoading(true);

    try {
      await updateGuest({
        guestId: guestIdParam,
        userId: convexUserId,
        nickname: guestData.nickname.trim(),
        email: guestData.email.trim() || undefined,
        socialHandle: guestData.socialHandle.trim() || undefined,
      });

      alert("Guest updated successfully.");
      router.push(`/event/${eventId}`);
    } catch (error) {
      console.error("Error updating guest:", error);
      alert("Failed to update guest.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <p>Please log in to edit guests.</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (event === undefined || guestList === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-600">Event not found.</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-600">Guest not found.</p>
          <Button
            onClick={() => router.push(`/event/${eventId}`)}
            className="mt-4"
          >
            Back to Event
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Edit Guest</h1>
          <div className="flex gap-2">
            <Link href={`/event/${eventId}`}>
              <Button variant="outline">Back to Event</Button>
            </Link>
    
          </div>
        </div>

        {/* Edit Guest Form */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Guest Information</CardTitle>
            <CardDescription>
              Update guest details for {event.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateGuest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nickname">Nickname *</Label>
                  <Input
                    id="nickname"
                    value={guestData.nickname}
                    onChange={(e) =>
                      setGuestData({ ...guestData, nickname: e.target.value })
                    }
                    placeholder="Guest nickname"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={guestData.email}
                    onChange={(e) =>
                      setGuestData({ ...guestData, email: e.target.value })
                    }
                    placeholder="guest@example.com"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="socialHandle">Social Handle</Label>
                <Input
                  id="socialHandle"
                  value={guestData.socialHandle}
                  onChange={(e) =>
                    setGuestData({ ...guestData, socialHandle: e.target.value })
                  }
                  placeholder="@username"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Guest"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/event/${eventId}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Guest Information Display */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Current Guest Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Guest ID</p>
                <p className="font-mono text-sm">{guest._id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm">
                  {new Date(guest._creationTime).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Visitor ID</p>
                <p className="font-mono text-sm">
                  {guest.fingerprint.visitorId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}