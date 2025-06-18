
interface RotateIconProps {
  size?: number;
  className?: string;
}

export function RotateIcon({ size = 26, className = "" }: RotateIconProps) {
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
        d="M23.5682 6.25C20.6971 2.95203 17.8035 1 13.3514 1C6.5299 1 1 6.37258 1 13C1 19.6275 6.5299 25 13.3514 25C18.7292 25 23.3043 21.6607 25 17.0001" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M24.1991 1V5.875C24.1991 6.49631 23.6807 7 23.0412 7H18.0234" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
} 