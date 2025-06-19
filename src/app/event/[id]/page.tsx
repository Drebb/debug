"use client";

import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import JSZip from "jszip";
import {
    ArrowLeft,
    ArrowRight,
    Download,
    Image as ImageIcon,
    Maximize,
    Minimize,
    Trash2,
    ZoomIn,
    ZoomOut
} from "lucide-react";
import Image from "next/image";
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

  // State for image viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [imageZoom, setImageZoom] = useState(1);
  const [showDetails, setShowDetails] = useState(false);

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
    guestList === undefined ||
    allImagesForDownload === undefined
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
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">{event.name}</h1>
          </div>
          <div className="flex gap-2">
            {event.status === "live" || event.status === "past" ? (
              <Button
                variant="outline"
                disabled={true}
                className="opacity-50 cursor-not-allowed"
                title={
                  event.status === "live"
                    ? "Editing is disabled while event is live"
                    : "Editing is disabled because event has finished"
                }
              >
                Edit Event
              </Button>
            ) : (
              <Link href={`/event/${eventId}/edit-event`}>
                <Button variant="outline">Edit Event</Button>
              </Link>
            )}
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
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === "upcoming"
                        ? "bg-blue-100 text-blue-800"
                        : event.status === "live"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {event.status.charAt(0).toUpperCase() +
                      event.status.slice(1)}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Date:</span>{" "}
                  {new Date(event.startDate).toLocaleDateString()} -{" "}
                  {new Date(event.endDate).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-semibold">Guest Tier:</span>{" "}
                  {guestPackages?.find(
                    (pkg) => pkg._id === event.guestPackageId
                  )?.tier || "Unknown"}
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
                Max Guests:{" "}
                {guestPackages?.find((pkg) => pkg._id === event.guestPackageId)
                  ?.maxGuests || "Unknown"}
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

        {/* QR Code */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Event QR Code</CardTitle>
            <CardDescription>
              Share this QR code with guests to allow them to access the camera
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <QRCodeDisplay
              eventId={event._id}
              eventName={event.name}
              size={200}
            />
          </CardContent>
        </Card>

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
                  $
                  {guestPackages?.find(
                    (pkg) => pkg._id === event.guestPackageId
                  )?.price || 0}
                </p>
                <p className="text-xs text-gray-500">
                  {guestPackages?.find(
                    (pkg) => pkg._id === event.guestPackageId
                  )?.tier || "Unknown"}{" "}
                  tier
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

        {/* Event Gallery */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Event Gallery
                </CardTitle>
                <CardDescription>
                  All images uploaded by guests for this event
                </CardDescription>
              </div>
              {allImagesForDownload && allImagesForDownload.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkDownload}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download ZIP ({allImagesForDownload.length})
                  </Button>
                  <Button
                    onClick={handleDeleteAllImages}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete All ({allImagesForDownload.length})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 py-4 bg-gradient-to-br border-slate-200 border from-[#FAFAFA] via-slate-100 to-slate-50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {allImagesForDownload === undefined ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl bg-slate-700 animate-pulse"
                  />
                ))
              ) : allImagesForDownload.length === 0 ? (
                <div className="col-span-full text-center text-gray-400">
                  No photos yet.
                </div>
              ) : (
                allImagesForDownload.map((imageData, index) => (
                  <div
                    key={imageData.galleryId}
                    className="relative group overflow-hidden rounded-2xl shadow-lg hover:scale-[1.03] transition-transform cursor-pointer"
                  >
                    {imageData.url ? (
                      <div className="aspect-square relative rounded-2xl bg-slate-700 flex items-center justify-center text-white">
                        <Image
                          onClick={() => {
                            setSelectedImageIndex(index);
                            setViewerOpen(true);
                          }}
                          src={imageData.url}
                          alt={`Uploaded by ${imageData.guestNickname}`}
                          fill
                          className="object-cover rounded-2xl"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="aspect-square rounded-2xl bg-slate-700 flex items-center justify-center text-white">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageDownload(imageData);
                        }}
                        className="bg-white/80 rounded-full p-1 shadow hover:bg-white"
                      >
                        <Download className="w-5 h-5 text-black" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageDelete(imageData.galleryId);
                        }}
                        className="bg-red-500/90 hover:bg-red-600 rounded-full p-1 shadow text-white"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Guest Info Badge */}
                    <div className="absolute bottom-2 left-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-black/60 text-white border-0"
                      >
                        {imageData.guestNickname}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Image Viewer Modal */}
        {viewerOpen &&
          selectedImageIndex !== null &&
          allImagesForDownload &&
          allImagesForDownload.length > 0 &&
          allImagesForDownload[selectedImageIndex] && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                {/* Navigation and controls */}
                <div className="absolute top-0 left-0 w-full flex justify-between items-center p-4 z-10">
                  <button
                    className="text-white hover:text-gray-300 bg-black/40 rounded-full p-2"
                    onClick={() => {
                      setViewerOpen(false);
                      setImageZoom(1);
                    }}
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="flex gap-4">
                    <button
                      className="text-white hover:text-gray-300 bg-black/40 rounded-full p-2"
                      onClick={() =>
                        handleImageDownload(
                          allImagesForDownload[selectedImageIndex]
                        )
                      }
                    >
                      <Download className="w-6 h-6" />
                    </button>
                    <button
                      className="text-white hover:text-gray-300 bg-red-500/70 hover:bg-red-600/70 rounded-full p-2"
                      onClick={() =>
                        handleImageDelete(
                          allImagesForDownload[selectedImageIndex].galleryId
                        )
                      }
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Main image */}
                <div className="max-w-[90vw] max-h-[80vh] relative">
                  <div
                    className="overflow-hidden"
                    style={{
                      transform: `scale(${imageZoom})`,
                      transformOrigin: "center",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <Image
                      src={allImagesForDownload[selectedImageIndex].url ?? ""}
                      alt="Image preview"
                      width={1000}
                      height={800}
                      className="max-w-full max-h-[80vh] object-contain rounded"
                      onError={(e) => {
                        console.error("Error loading image in viewer");
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23cccccc'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='10' text-anchor='middle' alignment-baseline='middle' fill='%23666666'%3EImage Error%3C/text%3E%3C/svg%3E";
                      }}
                      unoptimized
                    />
                  </div>
                  {/* Image info overlay */}
                  <div className="absolute top-4 left-4 gap-2 flex">
                    <div className="bg-black/60 text-white px-3 py-1 rounded-lg text-sm">
                      {new Date(
                        allImagesForDownload[selectedImageIndex].uploadTime
                      ).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="hover:cursor-pointer hover:ring hover:ring-white/20 hover:bg-black/65 bg-black/60 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      More Details
                    </button>
                  </div>
                  {/* Zoom controls */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() =>
                        setImageZoom(Math.max(0.5, imageZoom - 0.1))
                      }
                      className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      onClick={() => setImageZoom(1)}
                      className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80"
                    >
                      {imageZoom !== 1 ? (
                        <Minimize size={16} />
                      ) : (
                        <Maximize size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => setImageZoom(Math.min(2, imageZoom + 0.1))}
                      className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                </div>

                {/* Navigation arrows */}
                <div className="absolute bottom-4 left-0 w-full flex justify-between px-4">
                  <button
                    disabled={selectedImageIndex === 0}
                    onClick={() => {
                      if (selectedImageIndex > 0) {
                        setImageZoom(1);
                        setSelectedImageIndex(selectedImageIndex - 1);
                      }
                    }}
                    className={`text-white bg-black/40 rounded-full p-2 ${selectedImageIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/60"}`}
                  >
                    <div className="hover:cursor-pointer px-4 py-2 rounded-full bg-black/40">
                      <ArrowLeft size={16} />
                    </div>
                  </button>
                  <button className="text-white text-sm bg-black/40 px-6 flex justify-center items-center rounded-full">
                    {selectedImageIndex + 1}/{allImagesForDownload.length}
                  </button>
                  <button
                    disabled={
                      selectedImageIndex === allImagesForDownload.length - 1
                    }
                    onClick={() => {
                      if (
                        selectedImageIndex <
                        allImagesForDownload.length - 1
                      ) {
                        setImageZoom(1);
                        setSelectedImageIndex(selectedImageIndex + 1);
                      }
                    }}
                    className={`text-white bg-black/40 rounded-full p-2 ${selectedImageIndex === allImagesForDownload.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/60"}`}
                  >
                    <div className="hover:cursor-pointer px-4 py-2 rounded-full bg-black/40">
                      <ArrowRight size={16} />
                    </div>
                  </button>
                </div>

                {/* Details panel */}
                {showDetails &&
                  selectedImageIndex !== null &&
                  allImagesForDownload[selectedImageIndex] && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-6 overflow-auto">
                      <div className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-bold text-white">
                            Image Details
                          </h3>
                          <button
                            onClick={() => setShowDetails(false)}
                            className="text-gray-400 hover:text-white text-2xl"
                          >
                            &times;
                          </button>
                        </div>

                        <div className="flex gap-4">
                          <div className="flex flex-col w-full mb-4 mt-2">
                            <h4 className="text-gray-400 text-sm mb-1">
                              Guest Information
                            </h4>
                            <div className="bg-gray-800 rounded-lg p-3 mb-3">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-lg font-bold">
                                  {allImagesForDownload[
                                    selectedImageIndex
                                  ].guestNickname
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <h5 className="font-medium text-white">
                                    {
                                      allImagesForDownload[selectedImageIndex]
                                        .guestNickname
                                    }
                                  </h5>
                                </div>
                              </div>
                            </div>

                            <h4 className="text-gray-400 text-sm mb-1">
                              Image Metadata
                            </h4>
                            <div className="bg-gray-800 rounded-lg p-3">
                              <div className="mb-1 text-sm text-gray-300">
                                <strong>Gallery ID:</strong>{" "}
                                {
                                  allImagesForDownload[selectedImageIndex]
                                    .galleryId
                                }
                              </div>
                              <div className="mb-1 text-sm text-gray-300">
                                <strong>Event:</strong> {event.name}
                              </div>
                              <div className="mb-1 text-sm text-gray-300">
                                <strong>Upload Date:</strong>{" "}
                                {new Date(
                                  allImagesForDownload[
                                    selectedImageIndex
                                  ].uploadTime
                                ).toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-300">
                                <strong>File Size:</strong>{" "}
                                {(
                                  allImagesForDownload[selectedImageIndex]
                                    .size /
                                  1024 /
                                  1024
                                ).toFixed(2)}{" "}
                                MB
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setShowDetails(false)}
                            className="mr-2"
                          >
                            Close
                          </Button>
                          <Button
                            onClick={() =>
                              handleImageDownload(
                                allImagesForDownload[selectedImageIndex]
                              )
                            }
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

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
                        <th className="border px-4 py-2 text-left">Gallery</th>
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
                              onClick={() => setSelectedGuestId(guest._id)}
                              className="text-purple-600 hover:bg-purple-50"
                            >
                              View Gallery
                            </Button>
                          </td>
                          <td className="border px-4 py-2">
                            <div className="flex gap-2">
                              <Link
                                href={`/event/${eventId}/edit-guest/${guest._id}`}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  Edit
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGuestDelete(guest._id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </Button>
                            </div>
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

        {/* Guest Gallery Dialog */}
        <Dialog
          open={selectedGuestId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedGuestId(null);
              setGuestViewerOpen(false);
              setSelectedGuestImageIndex(null);
              setGuestImageZoom(1);
              setShowGuestDetails(false);
            }
          }}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
            {/* Guest Gallery Grid View */}
            {!guestViewerOpen && (
              <>
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      {guestGalleryImages?.[0]?.guestNickname}&apos;s Gallery
                    </span>
                    {guestGalleryImages && guestGalleryImages.length > 0 && (
                      <Button
                        onClick={handleGuestBulkDownload}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download ZIP ({guestGalleryImages.length})
                      </Button>
                    )}
                  </DialogTitle>
                </DialogHeader>

                <div className="px-6 pb-6 max-h-[calc(90vh-120px)] overflow-auto">
                  {guestGalleryImages && guestGalleryImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {guestGalleryImages.map((imageData, index) => (
                        <div
                          key={imageData.galleryId}
                          className="relative group overflow-hidden rounded-2xl shadow-lg hover:scale-[1.03] transition-transform cursor-pointer"
                        >
                          {imageData.url ? (
                            <div className="aspect-square relative rounded-2xl bg-slate-700 flex items-center justify-center text-white">
                              <Image
                                onClick={() => {
                                  setSelectedGuestImageIndex(index);
                                  setGuestViewerOpen(true);
                                }}
                                src={imageData.url}
                                alt={`Uploaded by ${imageData.guestNickname}`}
                                fill
                                className="object-cover rounded-2xl"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="aspect-square rounded-2xl bg-slate-700 flex items-center justify-center text-white">
                              No Image
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageDownload(imageData);
                              }}
                              className="bg-white/80 rounded-full p-1 shadow hover:bg-white"
                            >
                              <Download className="w-5 h-5 text-black" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageDelete(imageData.galleryId);
                              }}
                              className="bg-red-500/90 hover:bg-red-600 rounded-full p-1 shadow text-white"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          {/* Upload Date Badge */}
                          <div className="absolute bottom-2 left-2">
                            <Badge
                              variant="secondary"
                              className="text-xs bg-black/60 text-white border-0"
                            >
                              {new Date(
                                imageData.uploadTime
                              ).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        No images uploaded yet
                      </p>
                      <p className="text-gray-400 text-sm">
                        This guest hasn&apos;t uploaded any images
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Guest Image Viewer - Inside Dialog */}
            {guestViewerOpen &&
              selectedGuestImageIndex !== null &&
              guestGalleryImages &&
              guestGalleryImages.length > 0 &&
              guestGalleryImages[selectedGuestImageIndex] && (
                <div className="relative w-full h-[90vh] flex flex-col items-center justify-center bg-black">
                  {/* Navigation and controls */}
                  <div className="absolute top-0 left-0 w-full flex justify-between items-center p-4 z-10">
                    <button
                      className="text-white hover:text-gray-300 bg-black/40 rounded-full p-2"
                      onClick={() => {
                        setGuestViewerOpen(false);
                        setGuestImageZoom(1);
                        setShowGuestDetails(false);
                      }}
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex gap-4">
                      <button
                        className="text-white hover:text-gray-300 bg-black/40 rounded-full p-2"
                        onClick={() =>
                          handleImageDownload(
                            guestGalleryImages[selectedGuestImageIndex]
                          )
                        }
                      >
                        <Download className="w-6 h-6" />
                      </button>
                      <button
                        className="text-white hover:text-gray-300 bg-red-500/70 hover:bg-red-600/70 rounded-full p-2"
                        onClick={() =>
                          handleImageDelete(
                            guestGalleryImages[selectedGuestImageIndex]
                              .galleryId
                          )
                        }
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Main image */}
                  <div className="max-w-[90%] max-h-[70vh] relative">
                    <div
                      className="overflow-hidden"
                      style={{
                        transform: `scale(${guestImageZoom})`,
                        transformOrigin: "center",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <Image
                        src={
                          guestGalleryImages[selectedGuestImageIndex].url ?? ""
                        }
                        alt="Image preview"
                        width={1000}
                        height={800}
                        className="max-w-full max-h-[70vh] object-contain rounded"
                        onError={(e) => {
                          console.error("Error loading image in viewer");
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23cccccc'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='10' text-anchor='middle' alignment-baseline='middle' fill='%23666666'%3EImage Error%3C/text%3E%3C/svg%3E";
                        }}
                        unoptimized
                      />
                    </div>
                    {/* Image info overlay */}
                    <div className="absolute top-4 left-4 gap-2 flex">
                      <div className="bg-black/60 text-white px-3 py-1 rounded-lg text-sm">
                        {new Date(
                          guestGalleryImages[selectedGuestImageIndex].uploadTime
                        ).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => setShowGuestDetails(!showGuestDetails)}
                        className="hover:cursor-pointer hover:ring hover:ring-white/20 hover:bg-black/65 bg-black/60 text-white px-3 py-1 rounded-lg text-sm"
                      >
                        More Details
                      </button>
                    </div>
                    {/* Zoom controls */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() =>
                          setGuestImageZoom(Math.max(0.5, guestImageZoom - 0.1))
                        }
                        className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80"
                      >
                        <ZoomOut size={16} />
                      </button>
                      <button
                        onClick={() => setGuestImageZoom(1)}
                        className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80"
                      >
                        {guestImageZoom !== 1 ? (
                          <Minimize size={16} />
                        ) : (
                          <Maximize size={16} />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          setGuestImageZoom(Math.min(2, guestImageZoom + 0.1))
                        }
                        className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80"
                      >
                        <ZoomIn size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Navigation arrows */}
                  <div className="absolute bottom-4 left-0 w-full flex justify-between px-4">
                    <button
                      disabled={selectedGuestImageIndex === 0}
                      onClick={() => {
                        if (selectedGuestImageIndex > 0) {
                          setGuestImageZoom(1);
                          setSelectedGuestImageIndex(
                            selectedGuestImageIndex - 1
                          );
                        }
                      }}
                      className={`text-white bg-black/40 rounded-full p-2 ${selectedGuestImageIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/60"}`}
                    >
                      <div className="px-4 py-2 rounded-full bg-black/40">
                        <ArrowLeft size={16} />
                      </div>
                    </button>
                    <button className="text-white text-sm bg-black/40 px-6 flex justify-center items-center rounded-full">
                      {selectedGuestImageIndex + 1}/{guestGalleryImages.length}
                    </button>
                    <button
                      disabled={
                        selectedGuestImageIndex ===
                        guestGalleryImages.length - 1
                      }
                      onClick={() => {
                        if (
                          selectedGuestImageIndex <
                          guestGalleryImages.length - 1
                        ) {
                          setGuestImageZoom(1);
                          setSelectedGuestImageIndex(
                            selectedGuestImageIndex + 1
                          );
                        }
                      }}
                      className={`text-white bg-black/40 rounded-full p-2 ${selectedGuestImageIndex === guestGalleryImages.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/60"}`}
                    >
                      <div className="px-4 py-2 rounded-full bg-black/40">
                        <ArrowRight size={16} />
                      </div>
                    </button>
                  </div>

                  {/* Details panel */}
                  {showGuestDetails &&
                    selectedGuestImageIndex !== null &&
                    guestGalleryImages[selectedGuestImageIndex] && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-6 overflow-auto">
                        <div className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                              Image Details
                            </h3>
                            <button
                              onClick={() => setShowGuestDetails(false)}
                              className="text-gray-400 hover:text-white text-2xl"
                            >
                              &times;
                            </button>
                          </div>

                          <div className="flex gap-4">
                            <div className="flex flex-col w-full mb-4 mt-2">
                              <h4 className="text-gray-400 text-sm mb-1">
                                Guest Information
                              </h4>
                              <div className="bg-gray-800 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-lg font-bold">
                                    {guestGalleryImages[
                                      selectedGuestImageIndex
                                    ].guestNickname
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-white">
                                      {
                                        guestGalleryImages[
                                          selectedGuestImageIndex
                                        ].guestNickname
                                      }
                                    </h5>
                                  </div>
                                </div>
                              </div>

                              <h4 className="text-gray-400 text-sm mb-1">
                                Image Metadata
                              </h4>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <div className="mb-1 text-sm text-gray-300">
                                  <strong>Gallery ID:</strong>{" "}
                                  {
                                    guestGalleryImages[selectedGuestImageIndex]
                                      .galleryId
                                  }
                                </div>
                                <div className="mb-1 text-sm text-gray-300">
                                  <strong>Event:</strong> {event.name}
                                </div>
                                <div className="mb-1 text-sm text-gray-300">
                                  <strong>Upload Date:</strong>{" "}
                                  {new Date(
                                    guestGalleryImages[
                                      selectedGuestImageIndex
                                    ].uploadTime
                                  ).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-300">
                                  <strong>File Size:</strong>{" "}
                                  {(
                                    guestGalleryImages[selectedGuestImageIndex]
                                      .size /
                                    1024 /
                                    1024
                                  ).toFixed(2)}{" "}
                                  MB
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <Button
                              variant="outline"
                              onClick={() => setShowGuestDetails(false)}
                              className="mr-2"
                            >
                              Close
                            </Button>
                            <Button
                              onClick={() =>
                                handleImageDownload(
                                  guestGalleryImages[selectedGuestImageIndex]
                                )
                              }
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}