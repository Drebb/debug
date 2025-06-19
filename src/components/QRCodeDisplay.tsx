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

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <QRCode
          value={fullUrl}
          size={size}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox={`0 0 ${size} ${size}`}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-mnedium text-gray-900">{eventName}</p>
        <p className="text-xs text-gray-500 break-all">{fullUrl}</p>
      </div>
    </div>
  );
}
