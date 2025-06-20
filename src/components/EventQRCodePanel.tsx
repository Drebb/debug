import { Button } from "./ui/button";

interface EventQRCodePanelProps {
  qrCodeUrl: string;
  qrLink: string;
}

export function EventQRCodePanel({ qrCodeUrl, qrLink }: EventQRCodePanelProps) {
  // Download QR code image
  function handleDownload() {
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = "event-qr-code.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleViewLive() {
    window.open(qrLink, "_blank");
  }

  return (
    <div >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Event QR Code</h2>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-8">
        {qrCodeUrl ? (
          <div >
            <img
              src={qrCodeUrl}
              alt="Event QR Code"
              className="w-48 h-48 object-contain"
            />
          </div>
        ) : (
          <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
            No QR Code Available
          </div>
        )}
      </div>

      {/* Description */}
      <div className="text-center mb-2">
        <p className="text-lg text-black-600">This QR code will link to:</p>
      </div>

      {/* Link */}
      <div className="text-center mb-8">
        <a 
          href={qrLink} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors break-all"
        >
          {qrLink}
        </a>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button 
          onClick={handleDownload} 
          className="flex-1 bg-[#36A2DB] hover:bg-[#2a8bc4] text-white font-medium py-2.5"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
          Download
        </Button>
        <Button 
          onClick={handleViewLive} 
          className="flex-1 bg-[#D9F2FF] text-[#36A2DB] font-medium py-2.5">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
          View Live
        </Button>
      </div>
    </div>
  );
}

export default EventQRCodePanel; 