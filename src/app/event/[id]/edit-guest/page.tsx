"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
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
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function EditGuestPage() {
  const { id } = useParams();
  const eventId = id as Id<"events">;
  const router = useRouter();
  const { user } = useUser();

  const [newGuest, setNewGuest] = useState({
    nickname: "",
    email: "",
    socialHandle: "",
  });

  const event = useQuery(
    api.events.getEventById,
    eventId && user?.id ? { eventId, userId: user.id as Id<"users"> } : "skip"
  );
  const guestList = useQuery(
    api.guests.getGuestList,
    eventId && user?.id ? { eventId, userId: user.id as Id<"users"> } : "skip"
  );

  const deleteGuest = useMutation(api.guests.deleteGuestRecord);
  const addGuest = useMutation(api.guests.saveGuestRecord);

  const handleDeleteGuest = async (guestId: Id<"guests">) => {
    if (!user?.id) return;

    const confirm = window.confirm("Delete this guest and their uploads?");
    if (!confirm) return;

    const result = await deleteGuest({
      guestId,
      userId: user.id as Id<"users">,
    });
    if (result.success) {
      alert("Guest deleted successfully.");
    } else {
      alert("Failed to delete guest.");
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      alert("You must be logged in to add guests");
      return;
    }

    if (!newGuest.nickname) {
      alert("Nickname is required.");
      return;
    }

    try {
      await addGuest({
        eventId,
        userId: user.id as Id<"users">,
        nickname: newGuest.nickname,
        email: newGuest.email || undefined,
        socialHandle: newGuest.socialHandle || undefined,
        fingerprint: {
          visitorId: "manual-addition",
          userAgent: navigator.userAgent,
        },
      });

      setNewGuest({
        nickname: "",
        email: "",
        socialHandle: "",
      });

      alert("Guest added successfully.");
    } catch (error) {
      console.error("Error adding guest:", error);
      alert("Failed to add guest.");
    }
  };

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <p>Please log in to manage guests.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Edit Guests</h1>
          <div className="flex gap-2">
            <Link href={`/event/${eventId}`}>
              <Button variant="outline">Back to Event</Button>
            </Link>
          </div>
        </div>

        {/* Add Guest Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Guest</CardTitle>
            <CardDescription>
              Manually add a new guest to {event.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nickname">Nickname *</Label>
                  <Input
                    id="nickname"
                    value={newGuest.nickname}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, nickname: e.target.value })
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
                    value={newGuest.email}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, email: e.target.value })
                    }
                    placeholder="guest@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="socialHandle">Social Handle</Label>
                  <Input
                    id="socialHandle"
                    value={newGuest.socialHandle}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, socialHandle: e.target.value })
                    }
                    placeholder="@username"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button type="submit">Add Guest</Button>
            </form>
          </CardContent>
        </Card>

        {/* Guest List */}
        <Card>
          <CardHeader>
            <CardTitle>Guest List</CardTitle>
            <CardDescription>Manage guests for {event.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {guestList ? (
              guestList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-4 py-2 text-left">Nickname</th>
                        <th className="border px-4 py-2 text-left">Email</th>
                        <th className="border px-4 py-2 text-left">Social</th>
                        <th className="border px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guestList.map((guest) => (
                        <tr
                          key={guest._id}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="border px-4 py-2">{guest.nickname}</td>
                          <td className="border px-4 py-2">
                            {guest.email ?? "—"}
                          </td>
                          <td className="border px-4 py-2">
                            {guest.socialHandle ?? "—"}
                          </td>
                          <td className="border px-4 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGuest(guest._id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No guests found for this event.</p>
              )
            ) : (
              <p>Loading guest list...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
