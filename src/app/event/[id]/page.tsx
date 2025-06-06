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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Download,
  Eye,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
    event && event !== null && eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );
  const uploadCount = useQuery(
    api.analytics.getAllTotalUploadPerEvent,
    event && event !== null && eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );
  const guestList = useQuery(
    api.guests.getGuestList,
    event && event !== null && eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );

  // Gallery queries
  const galleryImages = useQuery(
    api.gallery.getGalleryByEvent,
    event && event !== null && eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );
  const allImagesForDownload = useQuery(
    api.gallery.getAllImagesForDownload,
    event && event !== null && eventId && convexUserId ? { eventId, userId: convexUserId } : "skip"
  );

  const deleteEvent = useMutation(api.events.deleteEvent);
  const deleteGuest = useMutation(api.guests.deleteGuestRecord);
  const deleteGalleryImage = useMutation(api.gallery.deleteFromGallery);

  // State for guest gallery viewing
  const [selectedGuestId, setSelectedGuestId] = useState<Id<"guests"> | null>(
    null
  );

  // Query for selected guest's gallery
  const guestGalleryImages = useQuery(
    api.gallery.getGalleryByGuest,
    selectedGuestId && convexUserId
      ? { guestId: selectedGuestId, userId: convexUserId }
      : "skip"
  );

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

    toast.info(`Starting download of ${allImagesForDownload.length} images...`);

    for (const imageData of allImagesForDownload) {
      try {
        await handleImageDownload(imageData);
        // Add a small delay to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download ${imageData.filename}:`, error);
      }
    }
  };

  const handleGuestBulkDownload = async () => {
    if (!guestGalleryImages || guestGalleryImages.length === 0) {
      toast.error("No images to download for this guest");
      return;
    }

    const guestName = guestGalleryImages[0]?.guestNickname || "guest";
    toast.info(
      `Starting download of ${guestGalleryImages.length} images from ${guestName}...`
    );

    for (const imageData of guestGalleryImages) {
      try {
        await handleImageDownload(imageData);
        // Add a small delay to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download ${imageData.filename}:`, error);
      }
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
    galleryImages === undefined ||
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
            <Link href={`/event/${eventId}/edit-event`}>
              <Button variant="outline">Edit Event</Button>
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
                <Button
                  onClick={handleBulkDownload}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download All ({allImagesForDownload.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {galleryImages && galleryImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {allImagesForDownload?.map((imageData) => (
                  <div
                    key={imageData.galleryId}
                    className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors"
                  >
                    {/* Image */}
                    <img
                      src={imageData.url}
                      alt={`Uploaded by ${imageData.guestNickname}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* View Image */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Image by {imageData.guestNickname}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center">
                              <img
                                src={imageData.url}
                                alt={`Uploaded by ${imageData.guestNickname}`}
                                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                              />
                              <div className="mt-4 text-sm text-gray-600 text-center">
                                <p>
                                  <strong>Uploaded by:</strong>{" "}
                                  {imageData.guestNickname}
                                </p>
                                <p>
                                  <strong>Upload time:</strong>{" "}
                                  {new Date(
                                    imageData.uploadTime
                                  ).toLocaleString()}
                                </p>
                                <p>
                                  <strong>File size:</strong>{" "}
                                  {(imageData.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  onClick={() => handleImageDownload(imageData)}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    handleImageDelete(imageData.galleryId)
                                  }
                                  className="flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Download Image */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleImageDownload(imageData)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        {/* Delete Image */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleImageDelete(imageData.galleryId)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Guest Info Badge */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <Badge variant="secondary" className="text-xs">
                        {imageData.guestNickname}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No images uploaded yet</p>
                <p className="text-gray-400 text-sm">
                  Images uploaded by guests will appear here
                </p>
              </div>
            )}
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
          onOpenChange={(open) => !open && setSelectedGuestId(null)}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  {guestGalleryImages?.[0]?.guestNickname}'s Gallery
                </span>
                {guestGalleryImages && guestGalleryImages.length > 0 && (
                  <Button
                    onClick={handleGuestBulkDownload}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download All ({guestGalleryImages.length})
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            {guestGalleryImages && guestGalleryImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {guestGalleryImages.map((imageData) => (
                  <div
                    key={imageData.galleryId}
                    className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors"
                  >
                    {/* Image */}
                    <img
                      src={imageData.url}
                      alt={`Uploaded by ${imageData.guestNickname}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* View Image */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Image by {imageData.guestNickname}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center">
                              <img
                                src={imageData.url}
                                alt={`Uploaded by ${imageData.guestNickname}`}
                                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                              />
                              <div className="mt-4 text-sm text-gray-600 text-center">
                                <p>
                                  <strong>Uploaded by:</strong>{" "}
                                  {imageData.guestNickname}
                                </p>
                                <p>
                                  <strong>Upload time:</strong>{" "}
                                  {new Date(
                                    imageData.uploadTime
                                  ).toLocaleString()}
                                </p>
                                <p>
                                  <strong>File size:</strong>{" "}
                                  {(imageData.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  onClick={() => handleImageDownload(imageData)}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    handleImageDelete(imageData.galleryId)
                                  }
                                  className="flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Download Image */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleImageDownload(imageData)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        {/* Delete Image */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleImageDelete(imageData.galleryId)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Upload Date Badge */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <Badge variant="secondary" className="text-xs">
                        {new Date(imageData.uploadTime).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No images uploaded yet</p>
                <p className="text-gray-400 text-sm">
                  This guest hasn&apos;t uploaded any images
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
