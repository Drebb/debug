import * as React from "react";

const LocationIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M14.5 10C14.5 11.3807 13.3807 12.5 12 12.5C10.6193 12.5 9.5 11.3807 9.5 10C9.5 8.61929 10.6193 7.5 12 7.5C13.3807 7.5 14.5 8.61929 14.5 10Z"
      stroke="#766E6E"
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <path
      d="M19 10C19 14.3705 15.1142 18.3347 13.1329 20.0719C12.4764 20.6475 11.5236 20.6475 10.8671 20.0719C8.88581 18.3347 5 14.3705 5 10C5 6.13401 8.13401 3 12 3C15.866 3 19 6.13401 19 10Z"
      stroke="#766E6E"
      strokeWidth={2}
      strokeLinejoin="round"
    />
  </svg>
);

export default LocationIcon; 