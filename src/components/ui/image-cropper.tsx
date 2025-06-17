"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, {
    Crop,
    PixelCrop,
    centerCrop,
    makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedFile: File) => void;
  imageFile: File | null;
  isLoading?: boolean;
}

// Helper function to create a cropped image file
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("No 2d context"));
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const file = new File([blob], fileName, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        resolve(file);
      },
      "image/jpeg",
      0.9
    );
  });
}

export default function ImageCropper({
  isOpen,
  onClose,
  onCrop,
  imageFile,
  isLoading = false,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageUrl, setImageUrl] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);

  // Create image URL when file changes
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Create a crop that maintains 16:9 aspect ratio for cover photos
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        16 / 9,
        width,
        height
      ),
      width,
      height
    );

    setCrop(crop);
  }, []);

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current || !imageFile) {
      return;
    }

    try {
      const croppedFile = await getCroppedImg(
        imgRef.current,
        completedCrop,
        imageFile.name
      );
      onCrop(croppedFile);
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };

  const handleClose = () => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setImageUrl("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Position Your Cover Photo</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-hidden">
          <p className="text-sm text-gray-600">
            Drag to reposition and resize the crop area. The image will be optimized for a 16:9 aspect ratio.
          </p>
          
          {imageUrl && (
            <div className="flex-1 overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={16 / 9}
                minWidth={100}
                minHeight={56}
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageUrl}
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[50vh] object-contain"
                />
              </ReactCrop>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleCropComplete} 
            disabled={!completedCrop || isLoading}
            className="bg-gradient-to-r from-[#F04A35] to-[#F07935] hover:from-[#E03E2A] hover:to-[#E06A30] text-white"
          >
            {isLoading ? "Saving..." : "Save Cover Photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 