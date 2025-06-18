
interface CircleXIconProps {
  size?: number;
  className?: string;
}

export function CircleXIcon({ size = 110, className = "" }: CircleXIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="110" height="110" rx="55" fill="black" fillOpacity="0.8" />
      <path
        d="M96.25 55C96.25 77.7819 77.7819 96.25 55 96.25C32.2183 96.25 13.75 77.7819 13.75 55C13.75 32.2183 32.2183 13.75 55 13.75C77.7819 13.75 96.25 32.2183 96.25 55Z"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M68.75 41.25L41.25 68.75"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M68.75 68.75L41.25 41.25"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
} 