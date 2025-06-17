import * as React from "react";

const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.5 3.5H3.21481C3.54917 3.5 3.8614 3.3329 4.04686 3.0547L4.45314 2.4453C4.6386 2.1671 4.95083 2 5.2852 2H6.7148C7.04915 2 7.3614 2.1671 7.54685 2.4453L7.95315 3.0547C8.1386 3.3329 8.45085 3.5 8.7852 3.5H9.5C10.0523 3.5 10.5 3.94771 10.5 4.5V9C10.5 9.5523 10.0523 10 9.5 10H2.5C1.94771 10 1.5 9.5523 1.5 9V4.5C1.5 3.94771 1.94771 3.5 2.5 3.5Z"
      stroke="#FF2F2F"
      strokeLinecap="square"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 6.5C7.5 7.32845 6.82845 8 6 8C5.17155 8 4.5 7.32845 4.5 6.5C4.5 5.67155 5.17155 5 6 5C6.82845 5 7.5 5.67155 7.5 6.5Z"
      stroke="#FF2F2F"
      strokeLinecap="square"
      strokeLinejoin="round"
    />
  </svg>
);

export default CameraIcon; 