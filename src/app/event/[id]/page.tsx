"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const eventId = id as Id<"events">;

  // Get Convex user (with _id)
  const currentUser = useQuery(api.users.currentUser);
  const convexUserId = currentUser?._id;

  const event = useQuery(
    api.events.getEventById,
    eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );
  const guestCount = useQuery(
    api.analytics.getAllGuestCountPerEvent,
    eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );
  const uploadCount = useQuery(
    api.analytics.getAllTotalUploadPerEvent,
    eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );
  const guestList = useQuery(
    api.guests.getGuestList,
    eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );

  const deleteEvent = useMutation(api.events.deleteEvent);
  const deleteGuest = useMutation(api.guests.deleteGuestRecord);

  const handleDeleteEvent = async () => {
    if (!convexUserId) return;

    const confirm = window.confirm(
      "Are you sure you want to delete this event?"
    );
    if (!confirm) return;

    const result = await deleteEvent({
      eventId,
      userId: convexUserId,
    });
    if (result.success) {
      alert("Event deleted.");
      router.push("/dashboard");
    } else {
      alert("Failed to delete event.");
    }
  };

  const handleGuestDelete = async (guestId: Id<"guests">) => {
    if (!convexUserId) return;

    const confirm = window.confirm("Delete this guest and their uploads?");
    if (!confirm) return;

    const result = await deleteGuest({
      guestId,
      userId: convexUserId,
    });
    if (result.success) {
      alert("Guest deleted.");
    } else {
      alert("Failed to delete guest.");
    }
  };

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <p>Please log in to view this event.</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (
    event === undefined ||
    guestCount === undefined ||
    uploadCount === undefined ||
    guestList === undefined
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <p>Loading event data...</p>
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
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <div className="flex gap-2">
            <Link href={`/event/${eventId}/edit-event`}>
              <Button variant="outline">Edit Event</Button>
            </Link>
            <Link href={`/event/${eventId}/edit-guest`}>
              <Button variant="outline">Edit Guests</Button>
            </Link>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Delete Event
            </Button>
          </div>
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Type:</span> {event.eventType}
                </p>
                <p>
                  <span className="font-semibold">Location:</span>{" "}
                  {event.location.city}, {event.location.region}
                </p>
                <p>
                  <span className="font-semibold">Status:</span>{" "}
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </p>
                <p>
                  <span className="font-semibold">Date:</span>{" "}
                  {new Date(event.startDate).toLocaleDateString()} -{" "}
                  {new Date(event.endDate).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-semibold">Guest Tier:</span>{" "}
                  {event.guestPackage.tier}
                </p>
                <p>
                  <span className="font-semibold">Video:</span>{" "}
                  {event.videoPackage.enabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{guestCount}</p>
              <p className="text-sm text-gray-500">
                Max Guests: {event.guestPackage.maxGuests}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {uploadCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pricing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Base Package</p>
                <p className="text-lg font-semibold">
                  ${event.basePackage.totalBasePrice}
                </p>
                <p className="text-xs text-gray-500">
                  ${event.basePackage.dailyRate}/day ×{" "}
                  {event.basePackage.totalDays} days
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Guest Package</p>
                <p className="text-lg font-semibold">
                  ${event.guestPackage.additionalPrice}
                </p>
                <p className="text-xs text-gray-500">
                  {event.guestPackage.tier} tier
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Video Package</p>
                <p className="text-lg font-semibold">
                  ${event.videoPackage.price}
                </p>
                <p className="text-xs text-gray-500">
                  {event.videoPackage.enabled ? "Enabled" : "Disabled"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Price</p>
                <p className="text-2xl font-bold text-green-600">
                  ${event.price}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guest List */}
        <Card>
          <CardHeader>
            <CardTitle>Guest List</CardTitle>
            <CardDescription>
              All guests registered for this event
            </CardDescription>
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
                              onClick={() => handleGuestDelete(guest._id)}
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
