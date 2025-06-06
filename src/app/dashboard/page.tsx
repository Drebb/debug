// app/dashboard/page.jsx (App Router)
"use client";

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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  Edit,
  Eye,
  Filter,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type EventStatus = "all" | "upcoming" | "live" | "past";

// Helper to compute event status
function getEventStatus(event: { startDate: string | number; endDate: string | number }) {
  const now = Date.now();
  const start = typeof event.startDate === "number" ? event.startDate : new Date(event.startDate).getTime();
  const end = typeof event.endDate === "number" ? event.endDate : new Date(event.endDate).getTime();
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "past";
}

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<EventStatus>("all");
  const router = useRouter();

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
  // Compute status on the fly for all events
  const eventsWithComputedStatus = (allEvents || []).map(event => ({
    ...event,
    computedStatus: getEventStatus(event)
  }));

  // Filter events based on computed status
  const eventsToDisplay = statusFilter === "all"
    ? eventsWithComputedStatus
    : eventsWithComputedStatus.filter(e => e.computedStatus === statusFilter);

  // Mutations
  const deleteEventMutation = useMutation(api.events.deleteEvent);

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
    eventCount === undefined ||
    guestCount === undefined ||
    uploadCount === undefined ||
    eventsToDisplay === undefined
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {currentUser.first_name || currentUser.email}!
              </p>
            </div>
          </div>
          <Link href="/event/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Event
            </Button>
          </Link>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {eventCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Events you&apos;ve created
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Guests
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {guestCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all your events
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Uploads
              </CardTitle>
              <Upload className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {uploadCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Photos and videos uploaded
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  All Events
                  <span className="text-sm font-normal text-muted-foreground">
                    ({eventsToDisplay.length})
                  </span>
                </CardTitle>
                <CardDescription>View and manage your events</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={(value: EventStatus) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                    : "Try selecting a different filter"}
                </p>
                {statusFilter === "all" && (
                  <Link href="/event/create">
                    <Button>Create Your First Event</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {eventsToDisplay.map((event) => (
                  <div
                    key={event._id}
                    className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {event.name}
                      </h3>
                      <p className="text-gray-600 mb-1">
                        {event.location.city}, {event.location.region}
                      </p>
                      <p className="text-sm text-gray-500 mb-3">
                        {new Date(event.startDate).toLocaleDateString()} -{" "}
                        {new Date(event.endDate).toLocaleDateString()}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            event.computedStatus === "upcoming"
                              ? "bg-blue-100 text-blue-800"
                              : event.computedStatus === "live"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {event.computedStatus.charAt(0).toUpperCase() +
                            event.computedStatus.slice(1)}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {event.eventType}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          ${event.price}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4 lg:mt-0 lg:ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewEvent(event._id)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>

                      <Link href={`/event/${event._id}/edit-event`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          disabled={event.computedStatus === "live"}
                          title={event.computedStatus === "live" ? "Editing is disabled while event is live" : undefined}
                        >
                          <Edit className="h-3 w-3" />
                          Edit Event
                        </Button>
                      </Link>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
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
                              onClick={() => handleDeleteEvent(event._id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Event
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
