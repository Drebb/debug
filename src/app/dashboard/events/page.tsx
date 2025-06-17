"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CircleAndCrossSVG, HandCameraSVG } from "@/components/ui/decorative-svg";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type EventStatus = "all" | "upcoming" | "live" | "past";

// Custom hook to fetch event-specific analytics
function useEventAnalytics(eventId: Id<"events">, userId: Id<"users"> | undefined) {
  const guestCount = useQuery(
    api.analytics.getAllGuestCountPerEvent,
    eventId && userId ? { eventId, userId } : "skip"
  );
  const uploadCount = useQuery(
    api.analytics.getAllTotalUploadPerEvent,
    eventId && userId ? { eventId, userId } : "skip"
  );

  return {
    guestCount: guestCount ?? 0,
    uploadCount: uploadCount ?? 0,
    isLoading: guestCount === undefined || uploadCount === undefined
  };
}

export default function EventsPage() {
  const [statusFilter, setStatusFilter] = useState<EventStatus>("all");
  const router = useRouter();

  // Get current user from Convex (this gives us the proper Convex user ID)
  const currentUser = useQuery(api.users.currentUser);
  const userId = currentUser?._id;

  // Events queries - always call hooks
  const allEvents = useQuery(
    api.events.getAllEvents,
    userId ? { userId } : "skip"
  );
  const filteredEvents = useQuery(
    api.events.filterEventsByStatus,
    statusFilter !== "all" && userId ? { userId, status: statusFilter } : "skip"
  );

  // Use allEvents when no filter is applied, otherwise use filteredEvents
  const eventsToDisplay =
    statusFilter === "all" ? allEvents || [] : filteredEvents || [];

  // Mutations
  const deleteEventMutation = useMutation(api.events.deleteEvent);
  const updateEventStatusMutation = useMutation(api.events.updateEventStatus);

  // Update event statuses when events are loaded
  useEffect(() => {
    if (eventsToDisplay && eventsToDisplay.length > 0 && userId) {
      // Update all event statuses
      eventsToDisplay.forEach((event) => {
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
  }, [eventsToDisplay, userId, updateEventStatusMutation]);

  const handleDeleteEvent = async (eventId: Id<"events">) => {
    if (!userId) return;

    try {
      await deleteEventMutation({ eventId, userId });
      toast.success("Event deleted successfully");
    } catch (error) {
      toast.error("Failed to delete event");
      console.error(error);
    }
  };

  const handleViewEvent = (eventId: Id<"events">) => {
    router.push(`/event/${eventId}`);
  };

  if (
    currentUser === undefined ||
    allEvents === undefined ||
    eventsToDisplay === undefined
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-lg">Loading events...</div>
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
                You need to be logged in to view your events.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Events Section */}
        <div className="mb-8">
          {!allEvents || allEvents.length === 0 ? (
            // Show hero banner ONLY when no events exist at all (onboarding)
            <>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Events</h2>
              <p className="text-gray-600 text-base lg:text-lg mb-6">Manage all your events in one place</p>

              {/* Events Hero Banner */}
              <div className="relative bg-gradient-to-r from-[#36A2DB] to-[#5E74FF] rounded-2xl p-6 lg:p-8 mb-8 overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-6 right-48 opacity-70">
                  <CircleAndCrossSVG className="w-10 h-10 lg:w-12 lg:h-12" />
                </div>

                {/* Main content container */}
                <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex-1 z-10 max-w-md">
                    <p className="text-white/90 text-sm lg:text-base mb-4 lg:mb-6 font-medium">
                      Set the Scene. Share the Clicks. Make an Event!
                    </p>
                    <Link href="/event/create">
                      <Button className="bg-white hover:bg-gray-50 text-orange-500 hover:text-orange-600 px-6 py-3 rounded-lg font-medium shadow-md transition-all duration-200">
                        Create Your First Event
                      </Button>
                    </Link>
                  </div>

                  {/* Hand camera illustration - positioned on the right */}
                  <div className="absolute right-[-20px] top-1/2 transform -translate-y-1/2 lg:right-[-10px] xl:right-0">
                    <HandCameraSVG className="w-32 h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 opacity-95" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Show events management interface when events exist (even if current filter shows none)
            <div className="bg-white rounded-lg border">
              {/* Header with title, filter tabs, and create button */}
              <div className="p-6 border-b">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Events</h2>
                    <p className="text-gray-600 text-sm">Manage all your events in one place</p>
                  </div>
                  <Link href="/event/create">
                    <Button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus className="h-4 w-4" />
                      Create Event
                    </Button>
                  </Link>
                </div>

                {/* Filter tabs row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1">
                    <Button
                      variant={statusFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setStatusFilter("all")}
                      className="text-sm"
                    >
                      All Events
                    </Button>
                    <Button
                      variant={statusFilter === "live" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setStatusFilter("live")}
                      className="text-sm"
                    >
                      Active
                    </Button>
                    <Button
                      variant={statusFilter === "upcoming" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setStatusFilter("upcoming")}
                      className="text-sm"
                    >
                      Upcoming
                    </Button>
                    <Button
                      variant={statusFilter === "past" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setStatusFilter("past")}
                      className="text-sm"
                    >
                      Past
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Events List - Show when there are events OR when filtering shows empty results */}
        {(eventsToDisplay.length > 0 || (statusFilter !== "all" && allEvents && allEvents.length > 0)) && (
          <div className="p-6 bg-white rounded-lg border">
            {eventsToDisplay.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  {statusFilter === "all"
                    ? "No events found"
                    : `No ${statusFilter} events found`}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {statusFilter === "all"
                    ? "Get started by creating your first event"
                    : `You don't have any ${statusFilter} events at the moment. Try selecting a different filter or create a new event.`}
                </p>
                {statusFilter === "all" && (
                  <Link href="/event/create">
                    <Button>Create Your First Event</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventsToDisplay.map((event) => {
                  return <EventCard key={event._id} event={event} userId={userId} onDelete={handleDeleteEvent} onView={handleViewEvent} />;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Separate EventCard component to handle individual event analytics
function EventCard({
  event,
  userId,
  onDelete,
  onView
}: {
  event: any;
  userId: Id<"users"> | undefined;
  onDelete: (eventId: Id<"events">) => void;
  onView: (eventId: Id<"events">) => void;
}) {
  const { guestCount, uploadCount, isLoading } = useEventAnalytics(event._id, userId);

  return (
    <div className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Event Image Placeholder */}
      <div className="h-40 bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
        <Calendar className="h-12 w-12 text-blue-400" />
      </div>

      {/* Event Content */}
      <div className="p-4">
        {/* Status and Date */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              event.status === "upcoming"
                ? "bg-blue-100 text-blue-600"
                : event.status === "live"
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(event.startDate).toLocaleDateString()}
          </span>
        </div>

        {/* Event Title */}
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
          {event.name}
        </h3>

        {/* Location */}
        <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
          <span>📍</span>
          {event.location.city}, {event.location.region}
        </p>

        {/* Event Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <span>👥</span>
            {isLoading ? "..." : guestCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <span>📸</span>
            {isLoading ? "..." : uploadCount.toLocaleString()}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(event._id)}
            className="flex-1"
          >
            Manage Add-Ons
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will
                  permanently delete the event &quot;{event.name}
                  &quot; and all associated data including guests
                  and uploads.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(event._id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Event
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
} 