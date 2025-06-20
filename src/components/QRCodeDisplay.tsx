"use client";

import QRCode from "react-qr-code";

interface QRCodeDisplayProps {
  eventId: string;
  eventName: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({
  eventId,
  eventName,
  size = 256,
  className = "",
}: QRCodeDisplayProps) {
  // Get the current domain and construct the full URL
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";

  const fullUrl = `${baseUrl}/camera/${eventId}`;

  // Responsive sizing based on screen size
  const responsiveSize = {
    mobile: Math.min(size * 0.75, 200),
    tablet: Math.min(size * 0.9, 300),
    desktop: size
  };

  return (
    <div className={`flex flex-col items-center space-y-3 sm:space-y-4 ${className}`}>
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
        {/* Mobile QR Code */}
        <div className="block sm:hidden">
          <QRCode
            value={fullUrl}
            size={responsiveSize.mobile}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 ${responsiveSize.mobile} ${responsiveSize.mobile}`}
          />
        </div>
        
        {/* Tablet QR Code */}
        <div className="hidden sm:block lg:hidden">
          <QRCode
            value={fullUrl}
            size={responsiveSize.tablet}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 ${responsiveSize.tablet} ${responsiveSize.tablet}`}
          />
        </div>
        
        {/* Desktop QR Code */}
        <div className="hidden lg:block">
          <QRCode
            value={fullUrl}
            size={responsiveSize.desktop}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 ${responsiveSize.desktop} ${responsiveSize.desktop}`}
          />
        </div>
      </div>
      
      <div className="text-center max-w-full px-2">
        <p className="text-sm sm:text-base font-medium text-gray-900 mb-1 truncate">
          {eventName}
        </p>
        <p className="text-xs sm:text-sm text-gray-500 break-all leading-relaxed">
          {fullUrl}
        </p>
      </div>
    </div>
  );
}
