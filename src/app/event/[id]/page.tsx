"use client";

import EventQRCodePanel from "@/components/EventQRCodePanel";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "@/components/ui/calendar-icon";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { PeopleIcon } from "@/components/ui/people-icon";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import JSZip from "jszip";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Download,
  Edit,
  Menu,
  User
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  const guestPackages = useQuery(api.guestPackages.getGuestPackageTiers);

  // Fetch event first
  const event = useQuery(
    api.events.getEventById,
    eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );

  // Only fetch analytics/gallery if event is not null
  const guestCount = useQuery(
    api.analytics.getAllGuestCountPerEvent,
    event && event !== null && eventId && convexUserId
      ? { eventId, userId: convexUserId }
      : "skip"
  );
  const uploadCount = useQuery(
    api.analytics.getAllTotalUploadPerEvent,
    event && event !== null && eventId && convexUserId
      ? { eventId, userId: convexUserId }
      : "skip"
  );
  const guestList = useQuery(
    api.guests.getGuestList,
    event && event !== null && eventId && convexUserId
      ? { eventId, userId: convexUserId }
      : "skip"
  );

  // Gallery queries
  const allImagesForDownload = useQuery(
    api.gallery.getAllImagesForDownload,
    event && event !== null && eventId && convexUserId
      ? { eventId, userId: convexUserId }
      : "skip"
  );

  const deleteEvent = useMutation(api.events.deleteEvent);
  const deleteGuest = useMutation(api.guests.deleteGuestRecord);
  const deleteGalleryImage = useMutation(api.gallery.deleteFromGallery);
  const deleteAllImages = useMutation(api.gallery.deleteAllImagesFromEvent);
  const updateEventStatus = useMutation(api.events.updateEventStatus);

  // State for guest gallery viewing
  const [selectedGuestId, setSelectedGuestId] = useState<Id<"guests"> | null>(
    null
  );

  // State for gallery image viewer
  const [galleryViewerOpen, setGalleryViewerOpen] = useState(false);
  const [selectedGalleryImageIndex, setSelectedGalleryImageIndex] = useState<number | null>(
    null
  );

  // State for sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State for guest gallery image viewer
  const [guestViewerOpen, setGuestViewerOpen] = useState(false);
  const [selectedGuestImageIndex, setSelectedGuestImageIndex] = useState<
    number | null
  >(null);
  const [guestImageZoom, setGuestImageZoom] = useState(1);
  const [showGuestDetails, setShowGuestDetails] = useState(false);

  // Query for selected guest's gallery
  const guestGalleryImages = useQuery(
    api.gallery.getGalleryByGuest,
    selectedGuestId && convexUserId
      ? { guestId: selectedGuestId, userId: convexUserId }
      : "skip"
  );

  // State for tab navigation
  const [activeTab, setActiveTab] = useState<"overview" | "gallery" | "guests">("overview");

  // Update event status when page loads
  useEffect(() => {
    if (event && event !== null && convexUserId) {
      updateEventStatus({ eventId, userId: convexUserId }).catch((error) => {
        console.error("Failed to update event status:", error);
      });
    }
  }, [event, convexUserId, updateEventStatus, eventId]);

  const handleDeleteEvent = async () => {
    if (!convexUserId) return;

    const confirm = window.confirm(
      "Are you sure you want to delete this event?"
    );
    if (!confirm) return;

    try {
      const result = await deleteEvent({
        eventId,
        userId: convexUserId,
      });

      if (result.success) {
        toast.success("Event deleted successfully!");
        // Use replace to prevent going back to deleted event
        router.replace("/dashboard");
      } else {
        toast.error("Failed to delete event.");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event. Please try again.");
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

  // Gallery handlers
  const handleImageDelete = async (galleryId: Id<"gallery">) => {
    if (!convexUserId) return;

    const confirm = window.confirm(
      "Are you sure you want to delete this image?"
    );
    if (!confirm) return;

    try {
      await deleteGalleryImage({
        galleryId,
        userId: convexUserId,
      });
      toast.success("Image deleted successfully");
    } catch (error) {
      toast.error("Failed to delete image");
      console.error("Error deleting image:", error);
    }
  };

  const handleDeleteAllImages = async () => {
    if (!convexUserId) return;

    if (!allImagesForDownload || allImagesForDownload.length === 0) {
      toast.error("No images to delete");
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to delete ALL ${allImagesForDownload.length} images from this event? This action cannot be undone.`
    );
    if (!confirm) return;

    try {
      toast.info("Deleting all images...");
      const result = await deleteAllImages({
        eventId,
        userId: convexUserId,
      });

      if (result.success) {
        toast.success(`Successfully deleted ${result.deletedCount} images`);
      } else {
        toast.error("Failed to delete all images");
      }
    } catch (error) {
      toast.error("Failed to delete all images");
      console.error("Error deleting all images:", error);
    }
  };

  const handleImageDownload = async (downloadData: any) => {
    try {
      const response = await fetch(downloadData.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = downloadData.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Image downloaded successfully");
    } catch (error) {
      toast.error("Failed to download image");
      console.error("Error downloading image:", error);
    }
  };

  const handleBulkDownload = async () => {
    if (!allImagesForDownload || allImagesForDownload.length === 0) {
      toast.error("No images to download");
      return;
    }

    toast.info(
      `Preparing to download ${allImagesForDownload.length} images as ZIP...`
    );

    try {
      const zip = new JSZip();
      let successCount = 0;
      let failedCount = 0;

      // Add images to zip with progress tracking
      for (let i = 0; i < allImagesForDownload.length; i++) {
        const imageData = allImagesForDownload[i];
        try {
          const response = await fetch(imageData.url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const blob = await response.blob();
          const name = imageData.filename || `image_${imageData.galleryId}`;
          zip.file(name, blob);
          successCount++;

          // Update progress
          if (i % 5 === 0 || i === allImagesForDownload.length - 1) {
            toast.info(
              `Processing: ${i + 1}/${allImagesForDownload.length} images`
            );
          }
        } catch (error) {
          console.error(`Failed to fetch ${imageData.filename}:`, error);
          failedCount++;
        }
      }

      if (successCount === 0) {
        toast.error("Failed to download any images");
        return;
      }

      toast.info("Creating ZIP archive...");

      // Generate ZIP with progress callback
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      // Create download link
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      // Use event name if available for better filename
      const eventName = event?.name
        ? event.name.replace(/[^a-zA-Z0-9]/g, "_")
        : "event";
      a.download = `${eventName}_all_images.zip`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const message =
        failedCount > 0
          ? `ZIP downloaded! ${successCount} images downloaded, ${failedCount} failed`
          : `ZIP downloaded successfully! ${successCount} images included`;

      toast.success(message);
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast.error("Failed to create ZIP file. Please try again.");
    }
  };

  const handleGuestBulkDownload = async () => {
    if (!guestGalleryImages || guestGalleryImages.length === 0) {
      toast.error("No images to download for this guest");
      return;
    }

    const guestName = guestGalleryImages[0]?.guestNickname || "guest";
    toast.info(
      `Preparing to download ${guestGalleryImages.length} images from ${guestName} as ZIP...`
    );

    try {
      const zip = new JSZip();
      let successCount = 0;
      let failedCount = 0;

      // Add images to zip with progress tracking
      for (let i = 0; i < guestGalleryImages.length; i++) {
        const imageData = guestGalleryImages[i];
        try {
          const response = await fetch(imageData.url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const blob = await response.blob();
          const name = imageData.filename || `image_${imageData.galleryId}`;
          zip.file(name, blob);
          successCount++;

          // Update progress
          if (i % 5 === 0 || i === guestGalleryImages.length - 1) {
            toast.info(
              `Processing: ${i + 1}/${guestGalleryImages.length} images`
            );
          }
        } catch (error) {
          console.error(`Failed to fetch ${imageData.filename}:`, error);
          failedCount++;
        }
      }

      if (successCount === 0) {
        toast.error("Failed to download any images");
        return;
      }

      toast.info("Creating ZIP archive...");

      // Generate ZIP with compression
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      // Create download link
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      // Create filename with event name and guest name
      const eventName = event?.name
        ? event.name.replace(/[^a-zA-Z0-9]/g, "_")
        : "event";
      const cleanGuestName = guestName.replace(/[^a-zA-Z0-9]/g, "_");
      a.download = `${eventName}_${cleanGuestName}_images.zip`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const message =
        failedCount > 0
          ? `ZIP downloaded! ${successCount} images from ${guestName}, ${failedCount} failed`
          : `ZIP downloaded successfully! ${successCount} images from ${guestName} included`;

      toast.success(message);
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast.error("Failed to create ZIP file. Please try again.");
    }
  };

  if (!user?.id) {
    return (
      <div className="flex min-h-screen bg-white overflow-hidden">
        <div className="hidden lg:block h-full">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col justify-center items-center min-h-0">
          <div className="w-full max-w-6xl px-4">
            <p>Please log in to view this event.</p>
            <Button onClick={() => router.push("/dashboard")} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (
    event === undefined ||
    guestCount === undefined ||
    uploadCount === undefined ||
    guestList === undefined ||
    allImagesForDownload === undefined
  ) {
    return (
      <div className="flex min-h-screen bg-white overflow-hidden">
        <div className="hidden lg:block h-full">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 min-h-0 overflow-auto pl-4 pr-4 pt-8 pb-8">
            <div className="max-w-6xl mx-auto">
              <p>Loading event data...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="flex min-h-screen bg-white-50 overflow-hidden">
        <div className="hidden lg:block h-full">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 min-h-0 overflow-auto pl-4 pr-4 pt-8 pb-8">
            <div className="max-w-6xl mx-auto">
              <p className="text-red-600">Event not found.</p>
              <Button onClick={() => router.push("/dashboard")} className="mt-4">
                Back to Dashboard
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div 
            className="absolute inset-y-0 left-0 z-50 w-80 max-w-[85vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onClose={() => setSidebarOpen(false)} isMobile={true} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar />
      </div>

      {/* Main content container */}
      <div className="flex-1 flex flex-col bg-white min-h-0">
        <main className="flex-1 min-h-0 overflow-auto px-4 py-4">
          {/* Mobile header */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">{event.name}</h1>
            <div className="w-10" />
          </div>
          {/* Header with navigation */}
          <div className="bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/dashboard/events" className="flex items-center gap-2 text-orange-600 text-base font-semibold">
                <ArrowLeft className="h-4 w-4" />
                Back to Events
              </Link>
              <Button 
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm font-medium"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{event.name}</h1>
                <p className="text-base font-medium text-gray-600">{event.location.city}</p>
              </div>
          </div>
          <hr className="border-t-2 border-gray-200 mx-6 my-2" />
          <div className="p-6">
            {/* Event Title and Status */}
            <div className="flex justify-between items-start mb-4">
              {/* Date info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg text-center w-16 h-14 flex flex-col justify-center items-center">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </div>
                  <div className="text-lg font-bold text-red-500">
                    {new Date(event.startDate).getDate()}
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">
                    {new Date(event.startDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })} <span className="text-xs font-medium text-gray-500 border border-gray-200 rounded-full px-2 py-1">Week {Math.ceil(new Date(event.startDate).getDate() / 7)}</span>
                  </p>
                  <p className="text-sm text-gray-500 font-regular">
                    {new Date(event.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })} – {new Date(event.endDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border border-gray-200 rounded-[8px] px-2 py-1">
                <span className="text-base font-medium text-gray-500">Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    event.status === "upcoming"
                      ? " text-[#36DB8B]"
                      : event.status === "live"
                        ? " text-[#36DB8B]"
                        : " text-red-700"
                  }`}
                >
                  ● {event.status === "live" ? "Active" : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>
            </div>
            


            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* Guests Card */}
              <Card className="">
                <CardContent className="p-3 sm:p-4 flex items-start">
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 w-full">
                    <div className="w-10 h-10 border border-gray-200 bg-white rounded-lg flex items-center justify-center shrink-0">
                      <PeopleIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-[16px] font-semibold font-inter text-[#535862] mb-1">Guests</p>
                      <div className="text-2xl sm:text-[32px] font-medium font-inter text-[#000000]">
                        {guestCount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Media Uploads Card */}
              <Card className="">
                <CardContent className="p-3 sm:p-4 flex items-start">
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 w-full">
                    <div className="w-10 h-10 border border-gray-200 bg-white rounded-lg flex items-center justify-center shrink-0">
                      <CalendarIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-[16px] font-semibold font-inter text-[#535862] mb-1">Media Uploads</p>
                      <div className="text-2xl sm:text-[32px] font-medium font-inter text-[#000000]">
                        {uploadCount} Files
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Album Views Card */}
              <Card className="">
                <CardContent className="p-3 sm:p-4 flex items-start">
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 w-full">
                    <div className="w-10 h-10 border border-gray-200 bg-white rounded-lg flex items-center justify-center shrink-0">
                      <CalendarIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-[16px] font-semibold font-inter text-[#535862] mb-1">Album Views</p>
                      <div className="text-2xl sm:text-[32px] font-medium font-inter text-[#000000]">
                        0
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-gray-50 border border-gray-200 rounded-[12px] w-fit  mb-6">
              <button
                className={`px-6 py-2 text-sm font-medium rounded-[10px] transition-all 
                  ${activeTab === "overview"
                    ? "bg-white shadow text-gray-900"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                className={`px-6 py-2 text-sm font-medium rounded-[10px] transition-all mx-1
                  ${activeTab === "gallery"
                    ? "bg-white shadow text-gray-900"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                onClick={() => setActiveTab("gallery")}
              >
                Gallery
              </button>
              <button
                className={`px-6 py-2 text-sm font-medium rounded-[10px] transition-all mx-1
                  ${activeTab === "guests"
                    ? "bg-white shadow text-gray-900"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                onClick={() => setActiveTab("guests")}
              >
                Guests
              </button>
            </div>

              {/* Content Area */}
              <div >
                {activeTab === "overview" && (
                  <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                    {/* Event Details Card */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 min-w-[320px] h-fit lg:h-[500px] flex flex-col">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Details</h2>
                      <div className="space-y-3 text-sm flex-1">
                        <div>
                          <div className="text-black-500 font-semibold text-base">Location</div>
                          <div className="text-gray-500 font-medium text-sm">{event.location.city}, {event.location.region}</div>
                        </div>
                        <div>
                          <div className="text-black-500 font-medium">Capture Type</div>
                          <div className="text-gray-900">Photo + Video</div>
                        </div>
                        <div>
                          <div className="text-black-500 font-medium">Capture Limit</div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded">
                              Standard
                            </span>
                            <span className="text-gray-500 text-xs">(20 photos + 2 videos)</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-black-500 font-medium">Filters</div>
                          <div className="text-gray-900">Custom-brand</div>
                        </div>
                      </div>
                      {/* Add-Ons */}
                      <div className="mt-auto border-t border-gray-200 pt-4">
                        <h3 className="text-2xl font-bold text-black mb-2">Add-Ons</h3>
                        <div className="flex flex-col gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#36A2DB] rounded-full inline-block" />
                            <a href="#" className="text-[#36A2DB] text-sm font-medium hover:underline">Live Gallery</a>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#36A2DB] rounded-full inline-block" />
                            <a href="#" className="text-[#36A2DB] text-sm font-medium hover:underline">Branded QR Code</a>
                          </div>
                        </div>
                        <button className="w-full bg-[#36A2DB]/10 text-[#36A2DB] font-medium py-2 rounded-lg text-sm hover:bg-[#36A2DB]/20 transition">
                          Manage Add-Ons
                        </button>
                      </div>
                    </div>
                    {/* QR Code Card - only render EventQRCodePanel, no extra title/link/buttons */}
                    <div className="flex-1 bg-white rounded-3xl border border-gray-200 p-4 min-w-[320px] h-fit lg:h-[500px] flex flex-col gap-3">
                      {typeof window !== "undefined" && event && event._id && (
                        <EventQRCodePanel
                          qrCodeUrl={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/camera/${event._id}`)}`}
                          qrLink={`${window.location.origin}/camera/${event._id}`}
                        />
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "gallery" && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold">Event Gallery</h2>
                        <p className="text-gray-500 text-sm">
                          View and Manage all media uploads for this event
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleBulkDownload}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download All
                        </Button>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => toast.info('Share functionality coming soon!')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                          Share
                        </Button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <span className="text-gray-700 font-medium">Total Uploads</span>
                      <div className="text-2xl font-bold">{allImagesForDownload?.length ?? 0}</div>
                    </div>
                    {allImagesForDownload && allImagesForDownload.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {allImagesForDownload.map((img, idx) => (
                          <div
                            key={img.galleryId}
                            className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square cursor-pointer"
                            onClick={() => {
                              setSelectedGalleryImageIndex(idx);
                              setGalleryViewerOpen(true);
                            }}
                          >
                            <img
                              src={img.url}
                              alt={img.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-12">
                        No uploads yet.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "guests" && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold">Guest List</h2>
                        <p className="text-gray-500 text-sm">
                          View individual guest galleries and manage uploads
                        </p>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{guestList.length}</span> guests registered
                      </div>
                    </div>
                    
                    {guestList.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {guestList.map((guest) => (
                          <Card key={guest._id} className="hover:shadow-md transition-shadow duration-200">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{guest.nickname}</h3>
                                    <p className="text-sm text-gray-500">
                                      Guest
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Joined {new Date(guest._creationTime).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedGuestId(guest._id);
                                      setGuestViewerOpen(true);
                                    }}
                                    className="flex items-center gap-1"
                                  >
                                    <Camera className="w-3 h-3" />
                                    View Gallery
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No guests yet</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          Share your event QR code to let guests join and start uploading photos to your event gallery.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

        </main>
      </div>

      {/* Guest Gallery Modal */}
      <Dialog open={guestViewerOpen} onOpenChange={setGuestViewerOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden bg-[#3BA3DD]" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedGuestId && guestGalleryImages ? 
                `${guestGalleryImages[0]?.guestNickname || "Guest"}'s Gallery` : 
                "Guest Gallery"
              }
            </DialogTitle>
          </DialogHeader>
          {selectedGuestId && guestGalleryImages && (
            <div className="flex flex-col h-full">
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b border-white/20">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {guestGalleryImages[0]?.guestNickname || "Guest"}'s Gallery
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    Photos uploaded by this guest
                  </p>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="flex-1 overflow-auto px-6 py-[18px]">
                {guestGalleryImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {guestGalleryImages.map((img, idx) => (
                      <div
                        key={img.galleryId}
                        className="group relative rounded-lg overflow-hidden bg-white aspect-square cursor-pointer "
                        onClick={() => {
                          setSelectedGuestImageIndex(idx);
                          setGuestImageZoom(1);
                          setShowGuestDetails(false);
                        }}
                      >
                        <img
                          src={img.url}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-white">
                    <Camera className="w-16 h-16 mb-4 opacity-60" />
                    <h3 className="text-lg font-medium mb-2">No photos yet</h3>
                    <p className="text-sm text-center max-w-md text-white/80">
                      This guest hasn&apos;t uploaded any photos to the event gallery yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Close Button */}
              <div className="flex justify-end p-8 border-t border-white/20 ">
                <Button
                  onClick={() => setGuestViewerOpen(false)}
                  className="bg-white text-black px-4 py-2 hover:bg-white-100 rounded-lg font-medium rounded-[8px]"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Guest Gallery Image Viewer Modal */}
      {selectedGuestImageIndex !== null && guestGalleryImages && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm">
          {/* Close Button - Top Left */}
          <button
            onClick={() => {
              setSelectedGuestImageIndex(null);
              setGuestImageZoom(1);
              setShowGuestDetails(false);
            }}
            className="absolute top-6 left-6 z-70 flex items-center justify-center transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Action Buttons - Top Right */}
          <div className="absolute top-6 right-6 z-70 flex gap-2">
            <button
              onClick={() => handleImageDownload(guestGalleryImages[selectedGuestImageIndex])}
              className="w-12 h-12 flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.83301 8.33333L9.99967 12.5L14.1663 8.33333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 12.5V2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => handleImageDelete(guestGalleryImages[selectedGuestImageIndex].galleryId)}
              className="w-12 h-12 flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 5H4.16667H17.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.66699 5V3.33333C6.66699 2.89131 6.84258 2.46738 7.15514 2.15482C7.4677 1.84226 7.89163 1.66667 8.33366 1.66667H11.667C12.109 1.66667 12.533 1.84226 12.8455 2.15482C13.1581 2.46738 13.3337 2.89131 13.3337 3.33333V5M15.8337 5V16.6667C15.8337 17.1087 15.6581 17.5326 15.3455 17.8452C15.033 18.1577 14.609 18.3333 14.167 18.3333H5.83366C5.39163 18.3333 4.9677 18.1577 4.65514 17.8452C4.34258 17.5326 4.16699 17.1087 4.16699 16.6667V5H15.8337Z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.33301 9.16667V14.1667" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.667 9.16667V14.1667" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Main Photo */}
          <div className="relative h-full flex items-center justify-center py-[150px] bg-black/0">
            <img
              src={guestGalleryImages[selectedGuestImageIndex].url}
              alt={`Photo ${selectedGuestImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-[24px] border-2 border-white transition-transform duration-300"
            />
          </div>

          {/* Bottom Navigation Bar */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-[41px]">
            {/* Previous Button */}
            {guestGalleryImages.length > 1 && (
              <button
                onClick={() => {
                  const newIndex = selectedGuestImageIndex > 0 
                    ? selectedGuestImageIndex - 1 
                    : guestGalleryImages.length - 1;
                  setSelectedGuestImageIndex(newIndex);
                  setGuestImageZoom(1);
                }}
                disabled={selectedGuestImageIndex === 0}
                className="disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:scale-110 transform"
              >
                <svg width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 28C3.5 41.8072 14.6928 53 28.5 53C42.3071 53 53.5 41.8072 53.5 28C53.5 14.1929 42.3071 3 28.5 3C14.6928 3 3.5 14.1929 3.5 28Z" stroke="white" strokeWidth="5.55556" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M39.6094 27.9993H17.3872M17.3872 27.9993L25.7205 19.666M17.3872 27.9993L25.7205 36.3327" stroke="white" strokeWidth="5.55556" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            {/* Photo Counter */}
            <div className="px-6 py-3">
              <span className="text-[#3696D2] text-2xl font-bold">
                Images {selectedGuestImageIndex + 1} of {guestGalleryImages.length}
              </span>
            </div>

            {/* Next Button */}
            {guestGalleryImages.length > 1 && (
              <button
                onClick={() => {
                  const newIndex = selectedGuestImageIndex < guestGalleryImages.length - 1 
                    ? selectedGuestImageIndex + 1 
                    : 0;
                  setSelectedGuestImageIndex(newIndex);
                  setGuestImageZoom(1);
                }}
                disabled={selectedGuestImageIndex === guestGalleryImages.length - 1}
                className="disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:scale-110 transform"
              >
                <svg width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M53.5 28C53.5 41.8072 42.3072 53 28.5 53C14.6929 53 3.5 41.8072 3.5 28C3.5 14.1929 14.6929 3 28.5 3C42.3072 3 53.5 14.1929 53.5 28Z" stroke="white" strokeWidth="5.55556" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17.3906 27.9993H39.6128M39.6128 27.9993L31.2795 19.666M39.6128 27.9993L31.2795 36.3327" stroke="white" strokeWidth="5.55556" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Gallery Image Viewer Modal */}
      {selectedGalleryImageIndex !== null && allImagesForDownload && galleryViewerOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm">
          {/* Close Button - Top Left */}
          <button
            onClick={() => {
              setSelectedGalleryImageIndex(null);
              setGalleryViewerOpen(false);
            }}
            className="absolute top-6 left-6 z-70 flex items-center justify-center transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Action Buttons - Top Right */}
          <div className="absolute top-6 right-6 z-70 flex gap-2">
            <button
              onClick={() => handleImageDownload(allImagesForDownload[selectedGalleryImageIndex])}
              className="w-12 h-12 flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.83301 8.33333L9.99967 12.5L14.1663 8.33333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 12.5V2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => handleImageDelete(allImagesForDownload[selectedGalleryImageIndex].galleryId)}
              className="w-12 h-12 flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 5H4.16667H17.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.66699 5V3.33333C6.66699 2.89131 6.84258 2.46738 7.15514 2.15482C7.4677 1.84226 7.89163 1.66667 8.33366 1.66667H11.667C12.109 1.66667 12.533 1.84226 12.8455 2.15482C13.1581 2.46738 13.3337 2.89131 13.3337 3.33333V5M15.8337 5V16.6667C15.8337 17.1087 15.6581 17.5326 15.3455 17.8452C15.033 18.1577 14.609 18.3333 14.167 18.3333H5.83366C5.39163 18.3333 4.9677 18.1577 4.65514 17.8452C4.34258 17.5326 4.16699 17.1087 4.16699 16.6667V5H15.8337Z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.33301 9.16667V14.1667" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.667 9.16667V14.1667" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Main Photo */}
          <div className="relative h-full flex items-center justify-center py-[150px] bg-black/0">
            <img
              src={allImagesForDownload[selectedGalleryImageIndex].url}
              alt={`Photo ${selectedGalleryImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-[24px] border-2 border-white transition-transform duration-300"
            />
          </div>

          {/* Bottom Navigation Bar */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-[41px]">
            {/* Previous Button */}
            {allImagesForDownload.length > 1 && (
              <button
                onClick={() => {
                  const newIndex = selectedGalleryImageIndex > 0 
                    ? selectedGalleryImageIndex - 1 
                    : allImagesForDownload.length - 1;
                  setSelectedGalleryImageIndex(newIndex);
                }}
                disabled={selectedGalleryImageIndex === 0}
                className="disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:scale-110 transform"
              >
                <svg width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 28C3.5 41.8072 14.6928 53 28.5 53C42.3071 53 53.5 41.8072 53.5 28C53.5 14.1929 42.3071 3 28.5 3C14.6928 3 3.5 14.1929 3.5 28Z" stroke="white" strokeWidth="5.55556" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M39.6094 27.9993H17.3872M17.3872 27.9993L25.7205 19.666M17.3872 27.9993L25.7205 36.3327" stroke="white" strokeWidth="5.55556" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            {/* Photo Counter */}
            <div className="px-6 py-3">
              <span className="text-[#3696D2] text-2xl font-bold">
                Images {selectedGalleryImageIndex + 1} of {allImagesForDownload.length}
              </span>
            </div>

            {/* Next Button */}
            {allImagesForDownload.length > 1 && (
              <button
                onClick={() => {
                  const newIndex = selectedGalleryImageIndex < allImagesForDownload.length - 1 
                    ? selectedGalleryImageIndex + 1 
                    : 0;
                  setSelectedGalleryImageIndex(newIndex);
                }}
                disabled={selectedGalleryImageIndex === allImagesForDownload.length - 1}
                className="disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:scale-110 transform"
              >
                <svg width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M53.5 28C53.5 41.8072 42.3072 53 28.5 53C14.6929 53 3.5 41.8072 3.5 28C3.5 14.1929 14.6929 3 28.5 3C42.3072 3 53.5 14.1929 53.5 28Z" stroke="white" strokeWidth="5.55556" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17.3906 27.9993H39.6128M39.6128 27.9993L31.2795 19.666M39.6128 27.9993L31.2795 36.3327" stroke="white" strokeWidth="5.55556" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}