// app/dashboard/page.jsx (App Router)
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api"; // adjust path as needed
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Dashboard() {
  const eventCount = useQuery(api.analytics.getAllEventCount);
  const guestCount = useQuery(api.analytics.getAllGuestCountWhole);
  const uploadCount = useQuery(api.analytics.getAllTotalUploadWhole);
  const allEvents = useQuery(api.events.getAllEvents);

  if (
    eventCount === undefined ||
    guestCount === undefined ||
    uploadCount === undefined ||
    allEvents === undefined
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{eventCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{guestCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {uploadCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>All Events</CardTitle>
            <CardDescription>View and edit your events</CardDescription>
          </CardHeader>
          <CardContent>
            {allEvents.length === 0 ? (
              <p className="text-gray-500">No events found.</p>
            ) : (
              <div className="space-y-4">
                {allEvents.map((event) => (
                  <div
                    key={event._id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm"
                  >
                    <div>
                      <h3 className="font-semibold text-lg">{event.name}</h3>
                      <p className="text-gray-600">
                        {event.location.city}, {event.location.region}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.startDate).toLocaleDateString()} -{" "}
                        {new Date(event.endDate).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.status === "upcoming"
                              ? "bg-blue-100 text-blue-800"
                              : event.status === "live"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {event.status.charAt(0).toUpperCase() +
                            event.status.slice(1)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          ${event.price}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/edit_event?id=${event._id}`}>
                        <Button variant="outline" size="sm">
                          Edit Event
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
