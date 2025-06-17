// app/dashboard/page.jsx (App Router)
"use client";

import {
  LiveEventsIcon,
  TotalEventsIcon,
  TotalGuestsIcon,
  TotalSnapsIcon
} from "@/components/ui/analytics-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { EllipseSVG } from "@/components/ui/decorative-svg";
import { Group1Icon } from "@/components/ui/group-1-icon";
import { Group346Icon } from "@/components/ui/group-346-icon";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";

export default function Dashboard() {
  // Get current user from Convex (this gives us the proper Convex user ID)
  const currentUser = useQuery(api.users.currentUser);
  const userId = currentUser?._id;

  // Analytics queries - always call hooks, handle undefined userId inside
  const eventCount = useQuery(
    api.analytics.getAllEventCount,
    userId ? { userId } : "skip"
  );
  const guestCount = useQuery(
    api.analytics.getAllGuestCountWhole,
    userId ? { userId } : "skip"
  );
  const uploadCount = useQuery(
    api.analytics.getAllTotalUploadWhole,
    userId ? { userId } : "skip"
  );

  // Events queries for live events count
  const allEvents = useQuery(
    api.events.getAllEvents,
    userId ? { userId } : "skip"
  );

  // Mutations
  const updateEventStatusMutation = useMutation(api.events.updateEventStatus);

  // Update event statuses when events are loaded
  useEffect(() => {
    if (allEvents && allEvents.length > 0 && userId) {
      // Update all event statuses
      allEvents.forEach((event) => {
        updateEventStatusMutation({ eventId: event._id, userId }).catch(
          (error) => {
            console.error(
              `Failed to update status for event ${event._id}:`,
              error 
            );
          }
        );
      });
    }
  }, [allEvents, userId, updateEventStatusMutation]);

  if (
    currentUser === undefined ||
    eventCount === undefined ||
    guestCount === undefined ||
    uploadCount === undefined ||
    allEvents === undefined
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-lg">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Please log in</h2>
              <p className="text-gray-600">
                You need to be logged in to view your dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-2 pr-6 pt-6 pb-6 bg-gray-50 min-h-screen">
      <div className="w-full px-0 py-8 gap-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {currentUser.first_name || "Kobe"}
            </h1>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="space-y-6 mb-8">
          {/* First Row - 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
            {/* Live Events */}
            <div className="p-[2px] rounded-[12px] bg-gradient-to-r from-[#F04A35] to-[#FF9F1C]">
              <Card className="bg-white">
                <CardContent className="p-4 flex items-start">
                  <div className="flex flex-row items-start gap-4 w-full">
                    <LiveEventsIcon />
                    <div>
                      <p className="text-[16px] font-semibold font-inter text-[#535862] mb-1">Live Events</p>
                      <div className="text-[32px] font-medium font-inter text-[#000000]">
                        {allEvents?.filter(event => event.status === "live").length || 0}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Total Snaps */}
            <Card className="">
              <CardContent className="p-4 flex items-start">
                <div className="flex flex-row items-start gap-4 w-full">
                  <TotalSnapsIcon />
                  <div>
                    <p className="text-[16px] font-semibold font-inter text-[#535862] mb-1">Total Snaps</p>
                    <div className="text-[32px] font-medium font-inter text-[#000000]">
                      {uploadCount?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Event Visitors */}
            <Card className="">
              <CardContent className="p-4 flex items-start">
                <div className="flex flex-row items-start gap-4 w-full">
                  <TotalEventsIcon />
                  <div>
                    <p className="text-[16px] font-semibold font-inter text-[#535862] mb-1">Total Event Visitors</p>
                    <div className="text-[32px] font-medium font-inter text-[#000000]">
                      {guestCount?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row - 2 wider cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Events */}
            <Card className="">
              <CardContent className="p-4 flex items-start">
                <div className="flex flex-row items-start gap-4 w-full">
                  <TotalEventsIcon />
                  <div>
                    <p className="text-[16px] font-semibold font-inter text-[#535862] mb-1">Total Events</p>
                    <div className="text-[32px] font-medium font-inter text-[#000000]">
                      {eventCount || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Guests */}
            <Card className="">
              <CardContent className="p-4 flex items-start">
                <div className="flex flex-row items-start gap-4 w-full">
                  <TotalGuestsIcon />
                  <div>
                    <p className="text-[16px] font-semibold font-inter text-[#535862] mb-1">Total Guests</p>
                    <div className="text-[32px] font-medium font-inter text-[#000000]">
                      {guestCount?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions Section or Onboarding Hero */}
        <div className="relative mb-8 mt-[120px]">
          {/* Position the Ellipse behind the mascot */}
          <EllipseSVG className="hidden lg:block absolute top-[1px] right-0 w-full max-w-[700px] md:w-[400px] lg:w-[700px] h-auto z-5 pointer-events-none opacity-100" />
          <Group346Icon className="hidden lg:block absolute right-[20%] top-1/2 -translate-y-1/2 w-20 h-20 opacity-100 z-10" />
          {/* Hero Banner for onboarding or events */}
          <div className="bg-gradient-to-r from-[#36A2DB] to-[#5E74FF] rounded-2xl p-6 lg:p-8 mb-8 overflow-hidden relative z-0">
            {/* Main content container */}
            <div className="relative flex flex-row items-center justify-between gap-6">
              <div className="flex-1 z-10 max-w-md">
                <p className="text-white/90 text-sm lg:text-base mb-4 lg:mb-6 font-medium opacity-50">
                  Set the Scene. Share the Clicks. Make an Event!
                </p>
                <Link href="/event/create">
                  <Button className="bg-white hover:bg-gray-50 text-orange-500 hover:text-orange-600 px-6 py-3 rounded-lg font-medium shadow-md transition-all duration-200">
                    Create Your First Event
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <Group1Icon className="hidden lg:block absolute top-0 right-[5%] w-[260px] h-[260px] -translate-y-1/4 z-20 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
