"use client";

import { Button } from "@/components/ui/button";
import { CaptureIcon } from "@/components/ui/capture-icon";
import { CircleXIcon } from "@/components/ui/circle-x-icon";
import { CloseXIcon } from "@/components/ui/close-x-icon";
import { DeleteIcon } from "@/components/ui/delete-icon";
import { DownloadIcon } from "@/components/ui/download-icon";
import { FrameIcon } from "@/components/ui/frame-icon";
import { RotateIcon } from "@/components/ui/rotate-icon";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useMutation, useQuery } from "convex/react";
import {
  Camera
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

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

  // Photo preview modal states
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoRotations, setPhotoRotations] = useState<Record<string, number>>({});

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

  // Photo modal functions
  const openPhotoModal = (index: number) => {
    setSelectedPhotoIndex(index);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhotoIndex(null);
  };

  const goToPreviousPhoto = () => {
    if (selectedPhotoIndex !== null && guestGallery && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const goToNextPhoto = () => {
    if (selectedPhotoIndex !== null && guestGallery && selectedPhotoIndex < guestGallery.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const downloadPhoto = async () => {
    if (selectedPhotoIndex !== null && guestGallery) {
      const photo = guestGallery[selectedPhotoIndex];
      try {
        // Fetch the image as a blob to handle CORS issues
        const response = await fetch(photo.url);
        const blob = await response.blob();
        
        // Create a URL for the blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Create and click the download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `photo-${selectedPhotoIndex + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        toast.success("Photo downloaded successfully!");
      } catch (error) {
        console.error("Download error:", error);
        toast.error("Failed to download photo. Please try again.");
      }
    }
  };

  const rotatePhoto = () => {
    if (selectedPhotoIndex !== null && guestGallery) {
      const photoId = guestGallery[selectedPhotoIndex]._id;
      const currentRotation = photoRotations[photoId] || 0;
      const newRotation = currentRotation + 90;
      
      setPhotoRotations(prev => ({
        ...prev,
        [photoId]: newRotation
      }));
    }
  };

  if (isRegistered) {
    return (
      <>
        <div className="fixed inset-0 bg-gray-100 overflow-hidden px-24 py-16">
          {/* Camera View - Always Visible */}
          <div className="relative h-full w-full rounded-[20px] overflow-hidden">
          {/* Live Camera View - Always Visible */}
          <div className="relative h-full w-full">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={{
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: facingMode,
              }}
            />
          </div>

          {/* Full-Screen Photo Preview Overlay */}
          {capturedImage && !showCamera && (
            <div className="absolute inset-0 z-40">
              {/* Full-size captured image */}
              <img
                src={capturedImage}
                alt="Captured preview"
                className="w-full h-full object-cover rounded-[20px]"
              />
              
              {/* Control Buttons Overlay */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-16">
                {/* Reject/Retake Button (Red X) */}
                <button
                  onClick={retakePhoto}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-2xl"
                >
                  <svg 
                    width="28" 
                    height="28" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="text-white"
                  >
                    <path 
                      d="M18 6L6 18M6 6l12 12" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Approve/Save Button (Green Checkmark) */}
                <button
                  onClick={uploadPhoto}
                  disabled={isUploading}
                  className="w-16 h-16 bg-green-500 hover:bg-green-600 disabled:bg-green-400 rounded-full flex items-center justify-center transition-colors shadow-2xl"
                >
                  {isUploading ? (
                    <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg 
                      width="28" 
                      height="28" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      className="text-white"
                    >
                      <path 
                        d="M20 6L9 17l-5-5" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}




        </div>
         {/* Bottom Controls Bar - Outside Camera */}
         <div className="absolute bottom-5 left-10 right-10  bg-black/50 backdrop-blur-sm  py-4 px-25 rounded-[24px]">
              <div className="flex items-center justify-between w-full ">
                                  {/* Gallery Thumbnail */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView("gallery")}
                    className="p-0 rounded-lg overflow-hidden border-2 border-gray-600 w-[60px] h-[60px]"
                  >
                  {guestGallery && guestGallery.length > 0 ? (
                    <img
                      src={guestGallery[0].url}
                      alt="Last photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <Camera size={24} className="text-gray-400" />
                    </div>
                  )}
                </Button>

                                  {/* Capture Button */}
                  <button
                    onClick={capture}
                    className="p-0 bg-transparent border-0 hover:bg-transparent focus:outline-none"
                  >
                    <CaptureIcon size={70} />
                  </button>

                                  {/* Frame Icon */}
                  <button
                    onClick={() => {
                      // No function for now, just clickable
                      console.log("Frame icon clicked");
                    }}
                    className="p-0 bg-transparent border-0 hover:bg-transparent focus:outline-none rounded-lg w-[60px] h-[60px] flex items-center justify-center"
                  >
                    <FrameIcon size={40} />
                  </button>
              </div>
            </div>
        </div>

        {/* Full-Screen Gallery Modal - Outside camera container */}
        {activeView === "gallery" && (
          <div className="fixed inset-0 z-60 bg-black/95">
            {/* Gallery Grid */}
            <div className="h-full p-[40px] overflow-y-auto">
              {guestGallery && guestGallery.length > 0 ? (
                <div className="grid grid-cols-4 gap-[50px]">
                  {guestGallery.map((photo, index) => (
                    <div
                      key={photo._id}
                      className="relative aspect-square group cursor-pointer"
                      onClick={() => openPhotoModal(index)}
                    >
                      <img
                        src={photo.url}
                        alt="Your photo"
                        className="w-full h-full object-cover rounded-md "
                      />
                    
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-white">
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

            {/* Circle X Button - Bottom Center */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <button
                onClick={() => setActiveView("camera")}
                className="p-0 bg-transparent border-0 hover:bg-transparent focus:outline-none"
              >
                <CircleXIcon size={80} />
              </button>
            </div>
          </div>
        )}

        {/* Full-Screen Photo Modal - Outside camera container */}
        {showPhotoModal && selectedPhotoIndex !== null && guestGallery && (
          <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm">
            {/* Close Button - Top Left */}
            <button
              onClick={closePhotoModal}
              className="absolute top-6 left-6 z-70 flex items-center justify-center transition-colors"
            >
              <CloseXIcon size={48} className="text-white" />
            </button>

            {/* Action Buttons - Top Right */}
            <div className="absolute top-6 right-6 z-70 flex gap-2">
              <button
                onClick={rotatePhoto}
                className="w-12 h-12 flex items-center justify-center transition-colors"
              >
                <RotateIcon size={20} className="text-white" />
              </button>
              <button
                onClick={() => {
                  deletePhoto(guestGallery[selectedPhotoIndex]._id);
                  if (guestGallery.length === 1) {
                    closePhotoModal();
                  } else if (selectedPhotoIndex === guestGallery.length - 1) {
                    setSelectedPhotoIndex(selectedPhotoIndex - 1);
                  }
                }}
                className="w-12 h-12 flex items-center justify-center transition-colors"
              >
                <DeleteIcon size={20} className="text-white" />
              </button>
              <button
                onClick={downloadPhoto}
                className="w-12 h-12 flex items-center justify-center transition-colors"
              >
                <DownloadIcon size={20} className="text-white" />
              </button>
            </div>

            {/* Main Photo */}
            <div className="relative h-full flex items-center justify-center py-[150px] bg-black/0">
              <img
                src={guestGallery[selectedPhotoIndex].url}
                alt={`Photo ${selectedPhotoIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-[24px] border-2 border-white transition-transform duration-300"
                style={{
                  transform: `rotate(${photoRotations[guestGallery[selectedPhotoIndex]._id] || 0}deg)`
                }}
              />
            </div>

            {/* Bottom Navigation Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-[41px]">
              {/* Previous Button */}
              {guestGallery.length > 1 && (
                <button
                  onClick={goToPreviousPhoto}
                  disabled={selectedPhotoIndex === 0}
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
                  Images {selectedPhotoIndex + 1} of {guestGallery.length}
                </span>
              </div>

              {/* Next Button */}
              {guestGallery.length > 1 && (
                <button
                  onClick={goToNextPhoto}
                  disabled={selectedPhotoIndex === guestGallery.length - 1}
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
      </>
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
