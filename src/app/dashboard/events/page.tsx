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
import CameraIcon from "@/components/ui/camera-icon";
import { EllipseSVG } from "@/components/ui/decorative-svg";
import { Group1Icon } from "@/components/ui/group-1-icon";
import { Group346Icon } from "@/components/ui/group-346-icon";
import GuestIcon from "@/components/ui/guest-icon";
import ImageCropper from "@/components/ui/image-cropper";
import LocationIcon from "@/components/ui/location-icon";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Calendar,
  ImageIcon,
  Trash2,
  Upload,
  X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
    eventsToDisplay === undefined
  ) {
    return (
      <div className="min-h-screen bg-white-50 p-3 sm:p-4 lg:pl-2 lg:pr-6 lg:pt-6 lg:pb-6">
        <div className="w-full px-0 py-4 sm:py-6 lg:py-8 gap-3">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-lg">Loading events...</div>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser === null) {
    return (
      <div className="min-h-screen bg-white-50 p-3 sm:p-4 lg:pl-2 lg:pr-6 lg:pt-6 lg:pb-6">
        <div className="w-full px-0 py-4 sm:py-6 lg:py-8 gap-3">
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
    <div className="p-3 sm:p-4 lg:pl-2 lg:pr-6 lg:pt-6 lg:pb-6 bg-gray-50 min-h-screen">
      <div className="w-full px-0 py-4 sm:py-6 lg:py-8 gap-3">
        {/* Events Section */}
        <div className="mb-6 sm:mb-8">
          {!allEvents || allEvents.length === 0 ? (
            // Show onboarding hero banner when no events exist
            <div className="relative mb-6 sm:mb-8 mt-8 sm:mt-16 lg:mt-[120px]">
              {/* Position the Ellipse behind the mascot */}
              <EllipseSVG className="hidden lg:block absolute top-[1px] right-0 w-full max-w-[700px] md:w-[400px] lg:w-[700px] h-auto z-5 pointer-events-none opacity-100" />
              <Group346Icon className="hidden lg:block absolute right-[25%] top-1/2 -translate-y-1/2 w-16 lg:w-20 h-16 lg:h-20 opacity-100 z-10" />
              {/* Hero Banner for onboarding or events */}
              <div className="bg-gradient-to-r from-[#36A2DB] to-[#5E74FF] rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 overflow-hidden relative z-0">
                {/* Main content container */}
                <div className="relative flex flex-row items-center justify-between gap-4 sm:gap-6">
                  <div className="flex-1 z-10 max-w-full sm:max-w-md">
                    <p className="text-white/90 text-xs sm:text-sm lg:text-base mb-3 sm:mb-4 lg:mb-6 font-medium opacity-50">
                      Set the Scene. Share the Clicks. Make an Event!
                    </p>
                    <Link href="/event/create">
                      <Button className="bg-white hover:bg-gray-50 text-orange-500 hover:text-orange-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium shadow-md transition-all duration-200">
                        Create Your First Event
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              <Group1Icon className="hidden lg:block absolute top-0 right-[5%] w-[200px] lg:w-[260px] h-[200px] lg:h-[260px] -translate-y-1/4 z-20 pointer-events-none" />
            </div>
          ) : (
            // Show events management interface when events exist (even if current filter shows none)
            <div className="bg-white rounded-lg border">
              {/* Header with title, filter tabs, and create button */}
              <div className="p-4 sm:p-6 border-b">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Events</h2>
                    <p className="text-gray-600 text-xs sm:text-sm">Manage all your events in one place</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    {/* Filter slider */}
                    <div className="relative bg-gray-100 rounded-lg p-1 flex h-10 w-full sm:w-80">
                      {/* Sliding background */}
                      <div 
                        className="absolute top-1 bottom-1 bg-white rounded-md shadow-sm transition-all duration-200 ease-in-out"
                        style={{
                          width: `${100 / 4}%`,
                          left: `${
                            statusFilter === "all" ? 0 :
                            statusFilter === "live" ? 25 :
                            statusFilter === "upcoming" ? 50 :
                            75
                          }%`,
                        }}
                      />
                      {/* Filter buttons */}
                      {(["all", "live", "upcoming", "past"] as EventStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={cn(
                            "relative z-10 flex-1 text-center py-1 px-2 text-xs sm:text-sm font-medium transition-colors duration-200 rounded-md",
                            statusFilter === status
                              ? "text-gray-900"
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          {status === "all" ? "All" :
                           status === "live" ? "Live" :
                           status === "upcoming" ? "Upcoming" :
                           "Past"}
                        </button>
                      ))}
                    </div>
                    
                    {/* Create Event Button */}
                    <Link href="/event/create" className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                        + Create Event
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Events List - Show when there are events OR when filtering shows empty results */}
        {(eventsToDisplay.length > 0 || (statusFilter !== "all" && allEvents && allEvents.length > 0)) && (
          <div className="bg-white rounded-lg border">
            {eventsToDisplay.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-base sm:text-lg font-medium text-muted-foreground mb-2">
                  {statusFilter === "all"
                    ? "No events found"
                    : `No ${statusFilter} events found`}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  {statusFilter === "all"
                    ? "Get started by creating your first event"
                    : `You don't have any ${statusFilter} events at the moment. Try selecting a different filter or create a new event.`}
                </p>
                {statusFilter === "all" && (
                  <Link href="/event/create">
                    <Button className="w-full sm:w-auto">Create Your First Event</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6">
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Mutations for cover image
  const generateUploadUrl = useMutation(api.gallery.generateUploadURL);
  const updateEventCoverImage = useMutation(api.events.updateEventCoverImage);
  const removeEventCoverImage = useMutation(api.events.removeEventCoverImage);
  
  // Query for cover image URL
  const coverImageUrl = useQuery(
    api.events.getEventCoverImageUrl,
    userId ? { eventId: event._id, userId } : "skip"
  );

  const handleImageUpload = async (file: File) => {
    if (!userId) return;
    
    setIsUploading(true);
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Upload failed");
      }
      
      const { storageId } = await result.json();
      
      // Update the event with the new cover image
      await updateEventCoverImage({
        eventId: event._id,
        userId,
        coverImageId: storageId,
      });
      
      toast.success("Cover image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload cover image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    
    // Set the selected file and show the cropper
    setSelectedImageFile(file);
    setShowCropper(true);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!userId) return;
    
    try {
      await removeEventCoverImage({
        eventId: event._id,
        userId,
      });
      toast.success("Cover image removed successfully!");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove cover image");
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setShowCropper(false);
    setSelectedImageFile(null);
    await handleImageUpload(croppedFile);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImageFile(null);
  };

  return (
    <>
      <div className="bg-white border rounded-xl shadow-sm hover:shadow-lg hover:border-[#F04A35] transition-all duration-300 overflow-hidden">
      {/* Event Image */}
      <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center group">
        {coverImageUrl ? (
          <>
            <Image
              src={coverImageUrl}
              alt={event.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Remove image button */}
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove cover image"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            {/* Upload placeholder */}
            <div className="flex flex-col items-center justify-center text-blue-400">
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Add Cover Photo</span>
            </div>
            
            {/* Upload button overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100"
            >
              <div className="bg-white/90 rounded-lg px-3 py-2 flex items-center gap-2 shadow-md">
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isUploading ? "Uploading..." : "Upload Photo"}
                </span>
              </div>
            </button>
          </>
        )}
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Event Content */}
      <div className="p-3 sm:p-4">
        {/* Date and Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <span className="text-xs sm:text-sm font-medium" style={{ color: "#3696D2" }}>
            {new Date(event.startDate).toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            })} - {new Date(event.startDate).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
              event.status === "upcoming"
                ? "bg-blue-100 text-blue-600"
                : event.status === "live"
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
        </div>

        {/* Event Title */}
        <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2 line-clamp-2">
          {event.name}
        </h3>

        {/* Location */}
        <p className="text-gray-600 font-medium text-xs sm:text-sm mb-3 flex flex-row items-center gap-1">
          <LocationIcon className="shrink-0" />
          <span className="truncate">{event.location.city}, {event.location.region}</span>
        </p>

        {/* Event Stats */}
        <div className="flex flex-row items-center gap-2 sm:gap-3 mb-4">
          <div className="flex flex-row items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border rounded-lg flex-1" style={{ borderColor: '#766E6E' }}>
            <GuestIcon className="shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
              {isLoading ? "..." : guestCount.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-row items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border rounded-lg flex-1" style={{ borderColor: '#766E6E' }}>
            <CameraIcon className="shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
              {isLoading ? "..." : uploadCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(event._id)}
            className="flex-1 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Manage Add-Ons</span>
            <span className="sm:hidden">Manage</span>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base sm:text-lg">
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  This action cannot be undone. This will
                  permanently delete the event &quot;{event.name}
                  &quot; and all associated data including guests
                  and uploads.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(event._id)}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  Delete Event
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>

    {/* Image Cropper Modal */}
    <ImageCropper
      isOpen={showCropper}
      onClose={handleCropCancel}
      onCrop={handleCropComplete}
      imageFile={selectedImageFile}
      isLoading={isUploading}
    />
  </>
  );
} 