import React from 'react';

interface CalendarIconProps {
  className?: string;
}

export const CalendarIcon: React.FC<CalendarIconProps> = ({ className = "" }) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3.33594 8.33333H16.6693M6.66927 4.16667V2.5M13.3359 4.16667V2.5M5.0026 16.6667H15.0026C15.9231 16.6667 16.6693 15.9205 16.6693 15V5.83333C16.6693 4.91286 15.9231 4.16667 15.0026 4.16667H5.0026C4.08213 4.16667 3.33594 4.91286 3.33594 5.83333V15C3.33594 15.9205 4.08213 16.6667 5.0026 16.6667Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}; 