import React from 'react';

interface PeopleIconProps {
  className?: string;
}

export const PeopleIcon: React.FC<PeopleIconProps> = ({ className = "" }) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12.9193 5.41667C12.9193 7.0275 11.6134 8.33333 10.0026 8.33333C8.39175 8.33333 7.08594 7.0275 7.08594 5.41667C7.08594 3.80583 8.39175 2.5 10.0026 2.5C11.6134 2.5 12.9193 3.80583 12.9193 5.41667Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M9.99896 10.8333C7.17302 10.8333 5.02897 12.5118 4.15104 14.8857C3.81038 15.8068 4.59758 16.6666 5.57968 16.6666H14.4183C15.4004 16.6666 16.1875 15.8068 15.8469 14.8857C14.969 12.5118 12.825 10.8333 9.99896 10.8333Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}; 