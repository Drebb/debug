
interface DownloadIconProps {
  size?: number;
  className?: string;
}

export function DownloadIcon({ size = 26, className = "" }: DownloadIconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 26 26" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M25 17.5V22C25 23.6569 23.6569 25 22 25H4C2.34314 25 1 23.6569 1 22V17.5" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M7.75 11.5L13 16.75L18.25 11.5" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M13 16V1" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
} 