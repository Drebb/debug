"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import Webcam from "react-webcam";
import {
  Camera,
  Upload,
  Trash2,
  Eye,
  ArrowLeft,
  RotateCcw,
  Image as ImageIcon,
  RotateCw,
} from "lucide-react";

export default function CameraPage() {
  const { id } = useParams();
  const eventId = id as Id<"events">;

  const [guestData, setGuestData] = useState({
    nickname: "",
    email: "",
    socialHandle: "",
  });

  const [fingerprint, setFingerprint] = useState<{
    visitorId: string;
    userAgent: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Camera states
  const [showCamera, setShowCamera] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const [currentGuestId, setCurrentGuestId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"camera" | "gallery">("camera");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const saveGuest = useMutation(api.guests.saveGuestRecord);
  const generateUploadUrl = useMutation(api.gallery.generateUploadURL);
  const uploadToGallery = useMutation(api.gallery.uploadToGalleryByGuest);
  const deleteFromGallery = useMutation(api.gallery.deleteFromGalleryByGuest);

  // Query to get guest's gallery
  const guestGallery = useQuery(
    api.gallery.getGalleryByGuestForGuest,
    currentGuestId
      ? {
          guestId: currentGuestId as any,
          eventId,
        }
      : "skip"
  );

  // Query to check existing registration - only run when we have fingerprint
  const existingRegistration = useQuery(
    api.guests.checkExistingRegistration,
    fingerprint
      ? {
          eventId,
          baseVisitorId: fingerprint.visitorId,
        }
      : "skip"
  );

  // Initialize fingerprinting on component mount
  useEffect(() => {
    const initFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const userAgent = navigator.userAgent;

        console.log("FingerprintJS result:", result.visitorId);
        setFingerprint({
          visitorId: result.visitorId,
          userAgent: userAgent,
        });
      } catch (error) {
        console.error("Error initializing fingerprint:", error);
        const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("Using fallback ID:", fallbackId);
        setFingerprint({
          visitorId: fallbackId,
          userAgent: navigator.userAgent,
        });
      }
    };

    initFingerprint();
  }, []);

  // Check for existing registration when fingerprint is ready and query result comes back
  useEffect(() => {
    if (existingRegistration !== undefined) {
      if (existingRegistration) {
        console.log("Found existing registration:", existingRegistration);
        setCurrentGuestId(existingRegistration._id);
        setIsRegistered(true);
      } else {
        console.log("No existing registration found for this device");
      }
    }
  }, [existingRegistration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestData.nickname.trim()) {
      toast.error("Nickname is required.");
      return;
    }

    if (!fingerprint) {
      toast.error("Fingerprinting not ready. Please wait and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const visitorIdWithNickname = `${fingerprint.visitorId}_${guestData.nickname.trim().replace(/[^a-zA-Z0-9]/g, "_")}`;

      const newGuestId = await saveGuest({
        eventId,
        nickname: guestData.nickname.trim(),
        email: guestData.email.trim() || undefined,
        socialHandle: guestData.socialHandle.trim() || undefined,
        fingerprint: {
          visitorId: visitorIdWithNickname,
          userAgent: fingerprint.userAgent,
        },
      });

      setCurrentGuestId(newGuestId);
      toast.success("Registration successful! Welcome to the event.");
      setIsRegistered(true);
    } catch (error: any) {
      console.error("Error saving guest:", error);

      if (error.message && error.message.includes("already registered")) {
        toast.error(error.message);
      } else {
        toast.error("Failed to register. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Camera functionality
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setShowCamera(false);
    }
  }, [webcamRef]);

  const uploadPhoto = async () => {
    if (!capturedImage || !currentGuestId) return;

    setIsUploading(true);
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      const { storageId } = await result.json();

      await uploadToGallery({
        fileId: storageId,
        eventId,
        guestId: currentGuestId as any,
      });

      toast.success("Photo uploaded successfully!");
      setCapturedImage(null);
      setShowCamera(true);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (galleryId: string) => {
    if (!currentGuestId) return;

    try {
      await deleteFromGallery({
        galleryId: galleryId as any,
        guestId: currentGuestId as any,
      });
      toast.success("Photo deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete photo. Please try again.");
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setShowCamera(true);
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (isRegistered) {
    return (
      <div className="fixed inset-0 bg-black">
        {/* Gallery View */}
        {activeView === "gallery" && (
          <div className="relative h-full bg-black text-white">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView("camera")}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft size={20} />
                </Button>
                <h1 className="text-lg font-medium">
                  My Photos ({guestGallery?.length || 0})
                </h1>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="h-full pt-16 pb-4 px-4 overflow-y-auto">
              {guestGallery && guestGallery.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {guestGallery.map((photo) => (
                    <div
                      key={photo._id}
                      className="relative aspect-square group"
                    >
                      <img
                        src={photo.url}
                        alt="Your photo"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 p-0"
                        onClick={() => deletePhoto(photo._id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {new Date(photo._creationTime).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Camera size={64} className="mb-4 opacity-50" />
                  <p className="text-lg mb-2">No photos yet</p>
                  <p className="text-sm opacity-70 mb-6">
                    Start capturing memories!
                  </p>
                  <Button
                    onClick={() => setActiveView("camera")}
                    className="bg-white text-black hover:bg-white/90"
                  >
                    Take Photo
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Camera View */}
        {activeView === "camera" && (
          <div className="relative h-full">
            {/* Captured Image View */}
            {capturedImage && !showCamera && (
              <div className="relative h-full">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="flex items-center justify-center gap-8">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={retakePhoto}
                      className="text-white hover:bg-white/20 flex flex-col items-center gap-1"
                    >
                      <RotateCcw size={24} />
                      <span className="text-xs">Retake</span>
                    </Button>

                    <Button
                      onClick={uploadPhoto}
                      disabled={isUploading}
                      size="lg"
                      className="bg-white text-black hover:bg-white/90 flex flex-col items-center gap-1 px-8"
                    >
                      <Upload size={24} />
                      <span className="text-xs">
                        {isUploading ? "Uploading..." : "Save"}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Camera View */}
            {showCamera && (
              <div className="relative h-full">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{
                    width: 1280,
                    height: 720,
                    facingMode: facingMode,
                  }}
                />

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-8">
                  <div className="flex items-center justify-between">
                    {/* Gallery Button - Bottom Left */}
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => setActiveView("gallery")}
                      className="text-white hover:bg-white/20 flex flex-col items-center gap-1"
                    >
                      <div className="relative">
                        <ImageIcon size={24} />
                        {guestGallery && guestGallery.length > 0 && (
                          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {guestGallery.length}
                          </div>
                        )}
                      </div>
                    </Button>

                    {/* Capture Button - Center */}
                    <Button
                      onClick={capture}
                      size="lg"
                      className="w-20 h-20 rounded-full bg-white border-4 border-white/30 hover:bg-white/90 p-0"
                    >
                      <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-300"></div>
                    </Button>

                    {/* Camera Flip Button - Bottom Right */}
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={flipCamera}
                      className="text-white hover:bg-white/20 flex flex-col items-center gap-1"
                    >
                      <RotateCw size={24} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show loading state while checking fingerprint and registration
  if (!fingerprint || existingRegistration === undefined) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading camera...</p>
          <p className="text-sm opacity-70 mt-2">
            Checking registration status...
          </p>
        </div>
      </div>
    );
  }

  // Registration form with minimal design
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-6">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <Camera size={48} className="mx-auto mb-4 text-blue-600" />
          <h1 className="text-2xl font-bold mb-2">Join Event</h1>
          <p className="text-gray-600 mb-2">
            Enter your details to start taking photos
          </p>
          <p className="text-sm text-gray-500">
            You&apos;ll be able to take photos and view your gallery after
            joining
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="nickname"
              value={guestData.nickname}
              onChange={(e) =>
                setGuestData({ ...guestData, nickname: e.target.value })
              }
              placeholder="Your nickname *"
              required
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <input
              id="email"
              type="email"
              value={guestData.email}
              onChange={(e) =>
                setGuestData({ ...guestData, email: e.target.value })
              }
              placeholder="Email (optional)"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <input
              id="socialHandle"
              value={guestData.socialHandle}
              onChange={(e) =>
                setGuestData({ ...guestData, socialHandle: e.target.value })
              }
              placeholder="@username (optional)"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !fingerprint}
            className="w-full p-3 text-lg"
          >
            {isLoading ? "Joining..." : "Start Camera"}
          </Button>
        </form>
      </div>
    </div>
  );
}
